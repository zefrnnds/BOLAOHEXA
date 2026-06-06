document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('content');
    const btnRanking = document.getElementById('btn-ranking');
    const btnJogos = document.getElementById('btn-jogos');
    const btnPalpites = document.getElementById('btn-palpites');
    const btnRefresh = document.getElementById('btn-refresh');
    const filterContainer = document.getElementById('filter-container');
    const selectParticipant = document.getElementById('select-participant');
    const selectGroup = document.getElementById('select-group');
    
    // ✅ VOLTAMOS PARA O SHEETDB (FUNCIONAVA ANTES)
       const API_BASE = 'https://script.google.com/macros/s/AKfycby62NI1pid2BY6Y61RjFfYf3T-hJxNe9sKd86gaJ8aqhMTzsaFYvvWWwbHWIgsllroU/exec';
 
    
    let currentView = null;
    let resultadosCache = {};
    let palpitesData = {};
    let placarGeralCache = null;
    let carregandoEmBackground = false;
    const carregandoAgora = {};
    const falhasCarregamento = {};

    const participantesMap = {
        'Robson': 'ROBSON',
        'AJR': 'JUNIOR (JR)',
        'GJR': 'JUNINHO',
        'MARC': 'MARCELLA',
        'ANA': 'PAULA',
        'PEDR': 'PEDRO',
        'RODR': 'RODRIGO',
        'GREI': 'GREISON',
        'ROG': 'ROGERIO',
        'ROM': 'ROMULO',
        'REGINALDO': 'REGINALDO'
    };

    const showLoading = (msg = ' Carregando dados... 🏟️') => {
        contentEl.innerHTML = `<p class="loading">${msg}</p>`;
    };

    const showError = (msg) => {
        contentEl.innerHTML = `<p class="error">❌ ${msg}</p>`;
    };

    // ✅ CACHE DE 2 HORAS PARA EVITAR RATE LIMIT
    async function fetchData(sheetName) {
        const cacheKey = `cache_${sheetName}`;
        const cacheTimeKey = `cache_time_${sheetName}`;
        const cacheExpira = 2 * 60 * 60 * 1000; // 2 HORAS
        
        // Tenta usar cache primeiro
        try {
            const cachedData = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            
            if (cachedData && cachedTime) {
                const tempoDecorrido = Date.now() - parseInt(cachedTime);
                if (tempoDecorrido < cacheExpira) {
                    console.log(`💾 Cache usado para ${sheetName} (válido por mais ${Math.round((cacheExpira - tempoDecorrido) / 60000)} min)`);
                    return JSON.parse(cachedData);
                }
            }
        } catch (e) {
            console.warn('Erro ao ler cache:', e);
        }

        try {
            const url = `${API_BASE}?sheet=${encodeURIComponent(sheetName)}`;
            console.log(`📡 Buscando: ${sheetName}`);
            
            const res = await fetch(url);
            
            if (res.status === 429) {
                console.log('⚠️ Rate limit - usando cache se disponível');
                const cachedData = localStorage.getItem(cacheKey);
                if (cachedData) return JSON.parse(cachedData);
                return null;
            }
            
            if (!res.ok) {
                console.error(`❌ Erro ${res.status} na aba: ${sheetName}`);
                return null;
            }
            
            const data = await res.json();
            
            // Salva no cache
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
            } catch (e) {
                console.warn('Erro ao salvar cache:', e);
            }
            
            console.log(`✅ ${sheetName}: ${data.length} linhas`);
            return data;
            
        } catch (err) {
            console.error(`Erro ao buscar ${sheetName}:`, err);
            return null;
        }
    }

    // ✅ FORÇAR ATUALIZAÇÃO (limpa cache)
    async function forcarAtualizacao(sheetName) {
        const cacheKey = `cache_${sheetName}`;
        const cacheTimeKey = `cache_time_${sheetName}`;
        
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimeKey);
        
        console.log(` Cache limpo para ${sheetName}, buscando dados frescos...`);
        return await fetchData(sheetName);
    }

    const todosJogos = {
        'A': [
            { data: '11/06/2026 - 16:00', casa: 'México', fora: 'África do Sul' },
            { data: '11/06/2026 - 23:00', casa: 'Coréia do Sul', fora: 'República Tcheca' },
            { data: '18/06/2026 - 13:00', casa: 'República Tcheca', fora: 'África do Sul' },
            { data: '18/06/2026 - 22:00', casa: 'México', fora: 'Coréia do Sul' },
            { data: '24/06/2026 - 22:00', casa: 'República Tcheca', fora: 'México' },
            { data: '24/06/2026 - 22:00', casa: 'África do Sul', fora: 'Coréia do Sul' }
        ],
        'B': [
            { data: '12/06/2026 - 16:00', casa: 'Canadá', fora: 'Bósnia e Herzegovina' },
            { data: '13/06/2026 - 16:00', casa: 'Catar', fora: 'Suíça' },
            { data: '18/06/2026 - 16:00', casa: 'Suíça', fora: 'Bósnia e Herzegovina' },
            { data: '18/06/2026 - 19:00', casa: 'Canadá', fora: 'Catar' },
            { data: '24/06/2026 - 16:00', casa: 'Suíça', fora: 'Canadá' },
            { data: '24/06/2026 - 16:00', casa: 'Bósnia e Herzegovina', fora: 'Catar' }
        ],
        'C': [
            { data: '13/06/2026 - 19:00', casa: 'Brasil', fora: 'Marrocos' },
            { data: '13/06/2026 - 22:00', casa: 'Haiti', fora: 'Escócia' },
            { data: '19/06/2026 - 19:00', casa: 'Escócia', fora: 'Marrocos' },
            { data: '19/06/2026 - 22:00', casa: 'Brasil', fora: 'Haiti' },
            { data: '24/06/2026 - 19:00', casa: 'Escócia', fora: 'Brasil' },
            { data: '24/06/2026 - 19:00', casa: 'Marrocos', fora: 'Haiti' }
        ],
        'D': [
            { data: '12/06/2026 - 22:00', casa: 'Estados Unidos', fora: 'Paraguai' },
            { data: '14/06/2026 - 01:00', casa: 'Austrália', fora: 'Turquia' },
            { data: '20/06/2026 - 01:00', casa: 'Turquia', fora: 'Paraguai' },
            { data: '19/06/2026 - 16:00', casa: 'Estados Unidos', fora: 'Austrália' },
            { data: '25/06/2026 - 23:00', casa: 'Turquia', fora: 'Estados Unidos' },
            { data: '25/06/2026 - 23:00', casa: 'Paraguai', fora: 'Austrália' }
        ],
        'E': [
            { data: '14/06/2026 - 14:00', casa: 'Alemanha', fora: 'Curaçao' },
            { data: '14/06/2026 - 20:00', casa: 'Costa do Marfim', fora: 'Equador' },
            { data: '20/06/2026 - 17:00', casa: 'Alemanha', fora: 'Costa do Marfim' },
            { data: '20/06/2026 - 21:00', casa: 'Equador', fora: 'Curaçao' },
            { data: '25/06/2026 - 17:00', casa: 'Equador', fora: 'Alemanha' },
            { data: '25/06/2026 - 17:00', casa: 'Curaçao', fora: 'Costa do Marfim' }
        ],
        'F': [
            { data: '14/06/2026 - 17:00', casa: 'Holanda', fora: 'Japão' },
            { data: '14/06/2026 - 23:00', casa: 'Suécia', fora: 'Tunísia' },
            { data: '21/06/2026 - 01:00', casa: 'Tunísia', fora: 'Japão' },
            { data: '20/06/2026 - 14:00', casa: 'Holanda', fora: 'Suécia' },
            { data: '25/06/2026 - 20:00', casa: 'Japão', fora: 'Suécia' },
            { data: '25/06/2026 - 20:00', casa: 'Tunísia', fora: 'Holanda' }
        ],
        'G': [
            { data: '15/06/2026 - 16:00', casa: 'Bélgica', fora: 'Egito' },
            { data: '15/06/2026 - 22:00', casa: 'Irã', fora: 'Nova Zelândia' },
            { data: '21/06/2026 - 16:00', casa: 'Bélgica', fora: 'Irã' },
            { data: '21/06/2026 - 22:00', casa: 'Nova Zelândia', fora: 'Egito' },
            { data: '27/06/2026 - 00:00', casa: 'Egito', fora: 'Irã' },
            { data: '27/06/2026 - 00:00', casa: 'Nova Zelândia', fora: 'Bélgica' }
        ],
        'H': [
            { data: '15/06/2026 - 13:00', casa: 'Espanha', fora: 'Cabo Verde' },
            { data: '15/06/2026 - 19:00', casa: 'Arábia Saudita', fora: 'Uruguai' },
            { data: '21/06/2026 - 13:00', casa: 'Espanha', fora: 'Arábia Saudita' },
            { data: '21/06/2026 - 19:00', casa: 'Uruguai', fora: 'Cabo Verde' },
            { data: '26/06/2026 - 21:00', casa: 'Cabo Verde', fora: 'Arábia Saudita' },
            { data: '26/06/2026 - 21:00', casa: 'Uruguai', fora: 'Espanha' }
        ],
        'I': [
            { data: '16/06/2026 - 16:00', casa: 'França', fora: 'Senegal' },
            { data: '16/06/2026 - 19:00', casa: 'Iraque', fora: 'Noruega' },
            { data: '22/06/2026 - 18:00', casa: 'França', fora: 'Iraque' },
            { data: '22/06/2026 - 21:00', casa: 'Noruega', fora: 'Senegal' },
            { data: '26/06/2026 - 16:00', casa: 'Noruega', fora: 'França' },
            { data: '26/06/2026 - 16:00', casa: 'Senegal', fora: 'Iraque' }
        ],
        'J': [
            { data: '17/06/2026 - 01:00', casa: 'Áustria', fora: 'Jordânia' },
            { data: '16/06/2026 - 22:00', casa: 'Argentina', fora: 'Argélia' },
            { data: '22/06/2026 - 14:00', casa: 'Argentina', fora: 'Áustria' },
            { data: '23/06/2026 - 00:00', casa: 'Jordânia', fora: 'Argélia' },
            { data: '27/06/2026 - 23:00', casa: 'Argélia', fora: 'Áustria' },
            { data: '27/06/2026 - 23:00', casa: 'Jordânia', fora: 'Argentina' }
        ],
        'K': [
            { data: '17/06/2026 - 14:00', casa: 'Portugal', fora: 'RD do Congo' },
            { data: '17/06/2026 - 23:00', casa: 'Uzbequistão', fora: 'Colômbia' },
            { data: '23/06/2026 - 14:00', casa: 'Portugal', fora: 'Uzbequistão' },
            { data: '23/06/2026 - 23:00', casa: 'Colômbia', fora: 'RD do Congo' },
            { data: '27/06/2026 - 20:30', casa: 'Colômbia', fora: 'Portugal' },
            { data: '27/06/2026 - 20:30', casa: 'RD do Congo', fora: 'Uzbequistão' }
        ],
        'L': [
            { data: '17/06/2026 - 17:00', casa: 'Inglaterra', fora: 'Croácia' },
            { data: '17/06/2026 - 20:00', casa: 'Gana', fora: 'Panamá' },
            { data: '23/06/2026 - 17:00', casa: 'Inglaterra', fora: 'Gana' },
            { data: '23/06/2026 - 20:00', casa: 'Panamá', fora: 'Croácia' },
            { data: '27/06/2026 - 18:00', casa: 'Panamá', fora: 'Inglaterra' },
            { data: '27/06/2026 - 18:00', casa: 'Croácia', fora: 'Gana' }
        ]
    };

    function renderRanking(data) {
        if (!data || data.length === 0) {
            contentEl.innerHTML = '<p class="error">❌ Nenhum dado encontrado na aba PLACAR GERAL</p>';
            return;
        }

        console.log(' Dados do PLACAR GERAL:', data);
        
        const dados = data.filter(j => j.PLACAR && j.PLACAR !== 'PLACAR' && j.GERAL !== undefined);
        dados.sort((a, b) => Number(b.GERAL || 0) - Number(a.GERAL || 0));
        
        let html = '<div id="ranking-grid">';
        
        dados.forEach((j, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '' : `${i + 1}º`;
            const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
            const total = Number(j.GERAL || 0);
            
            const pts20 = Number(j['VIT+EXATO +20'] || 0);
            const pts15 = Number(j['VIT+1 PLACA +15'] || 0);
            const pts10 = Number(j['VIT +10'] || 0);
            const pts5 = Number(j['1 PLACAR +5'] || 0);
            const zebra = Number(j['ZEBRA BONUS'] || 0);
            const gols = Number(j['TOTAL DE GOLS +3'] || 0);
            
            html += `
                <div class="card ${cls}">
                    <div class="position">${medal}</div>
                    <h2>${j.PLACAR}</h2>
                    <h3>${total} pts</h3>
                    <div class="details">
                        <p><span>🎯 Placar Exato (20):</span> <strong>${pts20}</strong></p>
                        <p><span>✅ Vencedor + 1 (15):</span> <strong>${pts15}</strong></p>
                        <p><span>🏆 Só Vencedor (10):</span> <strong>${pts10}</strong></p>
                        <p><span>⚽ Só 1 Placar (5):</span> <strong>${pts5}</strong></p>
                        ${zebra > 0 ? `<p><span>🦓 Zebra Bônus:</span> <strong>+${zebra}</strong></p>` : ''}
                        ${gols > 0 ? `<p><span>⚽ Total de Gols:</span> <strong>+${gols}</strong></p>` : ''}
                    </div>
                </div>`;
        });
        html += '</div>';
        contentEl.innerHTML = html;
    }

    function buscarResultados(data) {
        const mapa = {};
        if (!data || data.length === 0) return mapa;
        
        data.forEach(row => {
            if (!row.DATA_HORA || row.DATA_HORA.includes('GRUPO')) return;
            
            const timeCasa = row.CASA;
            const timeFora = row.FORA;
            if (!timeCasa || !timeFora) return;
            
            const placarCasa = (row.PLACAR_CASA !== null && row.PLACAR_CASA !== undefined && String(row.PLACAR_CASA).trim() !== '') 
                ? String(row.PLACAR_CASA).trim() 
                : '-';
            
            const placarFora = (row.PLACAR_FORA !== null && row.PLACAR_FORA !== undefined && String(row.PLACAR_FORA).trim() !== '') 
                ? String(row.PLACAR_FORA).trim() 
                : '-';
            
            const chave = `${timeCasa}-${timeFora}`;
            
            mapa[chave] = {
                casa: placarCasa,
                fora: placarFora
            };
        });
        
        return mapa;
    }

    function renderJogos(filtroGrupo = 'todos') {
        const grupos = filtroGrupo === 'todos' 
            ? Object.keys(todosJogos).sort()
            : [filtroGrupo];
        
        let html = '';
        
        grupos.forEach(grupo => {
            const jogos = todosJogos[grupo];
            
            html += `
                <div class="group-section">
                    <h2 class="group-title">🏆 Grupo ${grupo}</h2>
                    <div class="results-container">
                    <table class="games-table">
                        <thead>
                            <tr>
                                <th>Data / Hora</th>
                                <th>Jogo</th>
                                <th>Placar</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            jogos.forEach(jogo => {
                const chave = `${jogo.casa}-${jogo.fora}`;
                const resultado = resultadosCache[chave];
                let placarDisplay = '-';
                
                if (resultado && resultado.casa !== '-' && resultado.fora !== '-') {
                    placarDisplay = `${resultado.casa} x ${resultado.fora}`;
                }
                
                html += `
                    <tr>
                        <td class="date">${jogo.data}</td>
                        <td class="teams">${jogo.casa} <span class="vs">x</span> ${jogo.fora}</td>
                        <td class="result">${placarDisplay}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                    </div>
                </div>
            `;
        });
        
        contentEl.innerHTML = html;
    }

    function getPontos(row) {
        return Number(row['PONTUAÇAO'] || row['PONTUACAO'] || row.PONTUACAO || 0);
    }

    function calcularTotal(abreviacao) {
        const dados = palpitesData[abreviacao];
        if (!dados || dados.length === 0) return 0;
        return dados.reduce((sum, row) => sum + getPontos(row), 0);
    }

    function calcularPosicao(abreviacao) {
        const totalAtual = calcularTotal(abreviacao);
        let posicao = 1;
        
        Object.keys(participantesMap).forEach(abrev => {
            if (abrev === abreviacao) return;
            const totalOutro = calcularTotal(abrev);
            if (totalOutro > totalAtual) {
                posicao++;
            }
        });
        
        return posicao;
    }

    function normalizar(str) {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function renderPalpites(participante, filtroGrupo) {
        if (!participante || participante === '') {
            contentEl.innerHTML = `
                <div class="no-data">
                    <p> Selecione um participante para ver os palpites</p>
                </div>
            `;
            return;
        }

        const dados = palpitesData[participante];
        
        if (!dados || dados.length === 0) {
            const falhas = falhasCarregamento[participante] || 0;
            
            if (falhas >= 3) {
                contentEl.innerHTML = `
                    <div class="no-data">
                        <p>❌ Não foi possível carregar os dados de ${participantesMap[participante]}</p>
                        <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.7;">
                            Verifique sua conexão ou tente novamente mais tarde
                        </p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--gold); border: none; border-radius: 8px; cursor: pointer;">
                            🔄 Recarregar Página
                        </button>
                    </div>
                `;
                return;
            }
            
            contentEl.innerHTML = `
                <div class="no-data">
                    <p>⏳ Carregando dados de ${participantesMap[participante]}...</p>
                </div>
            `;
            
            if (!carregandoAgora[participante]) {
                carregarParticipante(participante).then(dados => {
                    if (dados) {
                        renderPalpites(participante, filtroGrupo);
                    } else {
                        falhasCarregamento[participante] = (falhasCarregamento[participante] || 0) + 1;
                        renderPalpites(participante, filtroGrupo);
                    }
                });
            }
            return;
        }

        let jogosFiltrados = dados.filter(row => {
            if (!row.DATA_HORA || row.DATA_HORA.includes('GRUPO')) return false;
            
            if (filtroGrupo === 'todos') {
                return true;
            }
            
            const casaNorm = normalizar(row.CASA);
            const foraNorm = normalizar(row.FORA);
            
            const grupoJogo = Object.keys(todosJogos).find(grupo => {
                return todosJogos[grupo].some(j => 
                    normalizar(j.casa) === casaNorm || normalizar(j.fora) === foraNorm
                );
            });
            
            return grupoJogo === filtroGrupo;
        });

        const totalPontos = jogosFiltrados.reduce((sum, row) => sum + getPontos(row), 0);
        const placarExato = jogosFiltrados.filter(row => getPontos(row) === 20).length;
        const vencedorEPlacar = jogosFiltrados.filter(row => getPontos(row) === 15).length;
        const apenasVencedor = jogosFiltrados.filter(row => getPontos(row) === 10).length;
        const apenasPlacar = jogosFiltrados.filter(row => getPontos(row) === 5).length;
        const errou = jogosFiltrados.filter(row => getPontos(row) === 0 && row.PLACAR_CASA && row.PLACAR_CASA !== '').length;

        const posicao = calcularPosicao(participante);
        const totalParticipantes = Object.keys(participantesMap).length;
        const medalhaPosicao = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : '';

        let html = `
            <div class="palpite-summary">
                <h2> ${participantesMap[participante] || participante}</h2>
                <div class="ranking-position">
                    ${medalhaPosicao} ${posicao}º lugar de ${totalParticipantes} participantes
                </div>
                <div class="summary-stats">
                    <div class="stat-box">
                        <span class="stat-value">${totalPontos}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value" style="color: #4ade80">${placarExato}</span>
                        <span class="stat-label">Placar Exato</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value" style="color: #fbbf24">${vencedorEPlacar}</span>
                        <span class="stat-label">Vencedor + 1</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value" style="color: #60a5fa">${apenasVencedor}</span>
                        <span class="stat-label">Só Vencedor</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value" style="color: #a78bfa">${apenasPlacar}</span>
                        <span class="stat-label">Só 1 Placar</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value" style="color: #f87171">${errou}</span>
                        <span class="stat-label">Errou</span>
                    </div>
                </div>
            </div>
            <div class="results-container">
                <table class="predictions-table">
                    <thead>
                        <tr>
                            <th class="col-date">Data / Hora</th>
                            <th class="col-match">Jogo</th>
                            <th>Palpite</th>
                            <th>Real</th>
                            <th>Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        jogosFiltrados.forEach(row => {
            const palpiteCasa = row.PLACAR_CASA || '-';
            const palpiteFora = row.PLACAR_FORA || '-';
            const palpite = `${palpiteCasa} x ${palpiteFora}`;
            
            const chave = `${row.CASA}-${row.FORA}`;
            const resultadoReal = resultadosCache[chave];
            const real = resultadoReal && resultadoReal.casa !== '-'
                ? `${resultadoReal.casa} x ${resultadoReal.fora}` 
                : '-';
            
            const pontos = getPontos(row);
            let classePalpite = '';
            
            if (pontos === 20) classePalpite = 'correct';
            else if (pontos >= 10) classePalpite = 'partial';
            else if (pontos > 0) classePalpite = 'partial';
            else if (palpiteCasa !== '-' && palpiteFora !== '-') classePalpite = 'wrong';
            
            html += `
                <tr>
                    <td class="col-date">${row.DATA_HORA}</td>
                    <td class="col-match">${row.CASA} <span class="vs">x</span> ${row.FORA}</td>
                    <td class="prediction ${classePalpite}">${palpite}</td>
                    <td>${real}</td>
                    <td class="points ${pontos === 0 ? 'zero' : ''}">${pontos > 0 ? '+' + pontos : '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        contentEl.innerHTML = html;
    }

    async function carregarParticipante(abrev) {
        if (palpitesData[abrev]) return palpitesData[abrev];
        if (carregandoAgora[abrev]) return null;
        if ((falhasCarregamento[abrev] || 0) >= 3) return null;
        
        carregandoAgora[abrev] = true;
        
        try {
            const dados = await fetchData(abrev);
            if (dados) {
                palpitesData[abrev] = dados;
                console.log(`✅ Carregado: ${abrev}`);
                return dados;
            } else {
                falhasCarregamento[abrev] = (falhasCarregamento[abrev] || 0) + 1;
                console.log(`❌ Falha ao carregar ${abrev} (tentativa ${falhasCarregamento[abrev]}/3)`);
                return null;
            }
        } finally {
            carregandoAgora[abrev] = false;
        }
    }

    async function carregarEmBackground() {
        if (carregandoEmBackground) return;
        carregandoEmBackground = true;
        
        const pendentes = Object.keys(participantesMap).filter(
            abrev => !palpitesData[abrev] && (falhasCarregamento[abrev] || 0) < 3
        );
        
        console.log(` Carregando ${pendentes.length} participantes em background...`);
        
        for (const abrev of pendentes) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await carregarParticipante(abrev);
        }
        
        carregandoEmBackground = false;
        console.log('🎉 Background completo!');
    }

    function popularSelectParticipantes() {
        const opcoes = Object.keys(participantesMap).map(abrev => {
            const nome = participantesMap[abrev];
            return `<option value="${abrev}">${nome}</option>`;
        }).join('');
        
        selectParticipant.innerHTML = `
            <option value="">Selecione...</option>
            ${opcoes}
        `;
    }

    btnRanking.addEventListener('click', async () => {
        if (currentView === 'ranking') return;
        currentView = 'ranking';
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btnRanking.classList.add('active');
        filterContainer.style.display = 'none';
        showLoading();
        
        const data = await fetchData('PLACAR GERAL');
        if (data) {
            placarGeralCache = data;
            renderRanking(data);
        } else {
            showError('Erro ao carregar PLACAR GERAL. Tente novamente.');
        }
    });

    btnJogos.addEventListener('click', async () => {
        if (currentView === 'jogos') return;
        currentView = 'jogos';
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btnJogos.classList.add('active');
        filterContainer.style.display = 'flex';
        
        selectParticipant.parentElement.style.display = 'none';
        selectGroup.parentElement.style.display = 'flex';
        
        showLoading();
        
        const data = await fetchData('Jogos');
        if (data) {
            resultadosCache = buscarResultados(data);
            renderJogos('todos');
        }
    });

    btnPalpites.addEventListener('click', async () => {
        if (currentView === 'palpites') return;
        currentView = 'palpites';
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btnPalpites.classList.add('active');
        filterContainer.style.display = 'flex';
        
        selectParticipant.parentElement.style.display = 'flex';
        selectGroup.parentElement.style.display = 'flex';
        
        if (Object.keys(resultadosCache).length === 0) {
            showLoading('⏳ Buscando resultados dos jogos...');
            const dataJogos = await fetchData('Jogos');
            if (dataJogos) {
                resultadosCache = buscarResultados(dataJogos);
            }
        }
        
        if (selectParticipant.value) {
            showLoading(`⏳ Carregando ${participantesMap[selectParticipant.value]}...`);
            await carregarParticipante(selectParticipant.value);
            renderPalpites(selectParticipant.value, selectGroup.value);
        } else {
            renderPalpites('', selectGroup.value);
        }
        
        setTimeout(() => carregarEmBackground(), 2000);
    });

    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            showLoading('🔄 Atualizando dados da planilha...');
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cache_')) localStorage.removeItem(key);
            });
            
            palpitesData = {};
            resultadosCache = {};
            placarGeralCache = null;
            
            console.log('🗑️ Todos os caches limpos!');
            
            if (currentView === 'ranking') {
                const data = await fetchData('PLACAR GERAL');
                if (data) renderRanking(data);
            } else if (currentView === 'jogos') {
                const data = await fetchData('Jogos');
                if (data) {
                    resultadosCache = buscarResultados(data);
                    renderJogos(selectGroup.value);
                }
            } else if (currentView === 'palpites') {
                const dataJogos = await fetchData('Jogos');
                if (dataJogos) {
                    resultadosCache = buscarResultados(dataJogos);
                }
                
                if (selectParticipant.value) {
                    await carregarParticipante(selectParticipant.value);
                    renderPalpites(selectParticipant.value, selectGroup.value);
                }
            }
        });
    }

    selectParticipant.addEventListener('change', async () => {
        if (currentView === 'palpites' && selectParticipant.value) {
            showLoading(`⏳ Carregando ${participantesMap[selectParticipant.value]}...`);
            await carregarParticipante(selectParticipant.value);
            renderPalpites(selectParticipant.value, selectGroup.value);
        }
    });

    selectGroup.addEventListener('change', () => {
        if (currentView === 'palpites') {
            renderPalpites(selectParticipant.value, selectGroup.value);
        } else if (currentView === 'jogos') {
            renderJogos(selectGroup.value);
        }
    });

    popularSelectParticipantes();
    btnRanking.click();

    window.palpitesData = palpitesData;
    window.resultadosCache = resultadosCache;
    window.todosJogos = todosJogos;
});