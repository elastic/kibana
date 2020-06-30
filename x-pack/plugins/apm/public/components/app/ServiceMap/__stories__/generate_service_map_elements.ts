/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSeverity } from '../../../../../common/ml_job_constants';

export function generateServiceMapElements(size: number): any[] {
  const services = range(size).map((i) => {
    const name = getName();
    const anomalyScore = randn(101);
    return {
      id: name,
      'service.environment': 'production',
      'service.name': name,
      'agent.name': getAgentName(),
      anomaly_score: anomalyScore,
      anomaly_severity: getSeverity(anomalyScore),
      actual_value: Math.random() * 2000000,
      typical_value: Math.random() * 1000000,
      ml_job_id: `${name}-request-high_mean_response_time`,
    };
  });

  const connections = range(Math.round(size * 1.5))
    .map((i) => {
      const sourceNode = services[randn(size)];
      const targetNode = services[randn(size)];
      return {
        id: `${sourceNode.id}~${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        ...(probability(0.3)
          ? {
              bidirectional: true,
            }
          : null),
      };
    })
    .filter(({ source, target }) => source !== target);

  return [
    ...services.map((serviceData) => ({ data: serviceData })),
    ...connections.map((connectionData) => ({ data: connectionData })),
  ];
}

function range(n: number) {
  return Array(n)
    .fill(0)
    .map((e, i) => i);
}

function randn(n: number) {
  return Math.floor(Math.random() * n);
}

function probability(p: number) {
  return Math.random() < p;
}

function getAgentName() {
  return AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
}

function getName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

const AGENT_NAMES = [
  'dotnet',
  'go',
  'java',
  'rum-js',
  'nodejs',
  'php',
  'python',
  'ruby',
];

const NAMES = [
  'abomination',
  'anaconda',
  'apocalypse',
  'arcade',
  'angel',
  'asp',
  'beast',
  'beetle',
  'bishop',
  'black-knight',
  'black-mamba',
  'black-widow',
  'blade',
  'blob',
  'boomerang',
  'bullseye',
  'black-panther',
  'cable',
  'cannonball',
  'carnage',
  'callisto',
  'colossus',
  'crimson-dynamo',
  'cyclops',
  'cypher',
  'daredevil',
  'dazzler',
  'deadpool',
  'deathbringer',
  'death',
  'deathlok',
  'deathstrike',
  'destiny',
  'detonator',
  'diablo',
  'doctor-doom',
  'doctor-octopus',
  'doctor-strange',
  'domino',
  'dragonhart,',
  'electro',
  'elektra',
  'falcon',
  'forge',
  'fury',
  'gambit',
  'gladiator',
  'green',
  'grizzly',
  'hammerhead',
  'havok',
  'hawk-owl',
  'hawkeye',
  'hobgoblin',
  'hulk',
  'human-torch',
  'hurricane',
  'iceman',
  'iron-man',
  'invisible-woman',
  'juggernaut',
  'kingpin',
  'ka-zar',
  'leech',
  'loki',
  'longshot',
  'lumpkin,',
  'madame-web',
  'magician',
  'magneto',
  'man-thing',
  'mastermind',
  'mister-fantastic',
  'mister-sinister',
  'mister-nix',
  'modok',
  'mojo',
  'mole-man',
  'morbius',
  'morlocks',
  'moondragon',
  'moon',
  'madrox',
  'mystique',
  'namor',
  'nightmare',
  'nightcrawler',
  'nighthawk',
  'nihil',
  'northstar',
  'omega-red',
  'orb-weaver',
  'ox',
  'polaris',
  'power-man',
  'princess-python',
  'proteus',
  'punisher',
  'pyro',
  'quicksilver',
  'rhino',
  'rogue',
  'ronin',
  'sabretooth',
  'sandman',
  'scorpion',
  'sentinel',
  'shadowcat',
  'shocker',
  'silvermane',
  'silver-surfer',
  'spider-man',
  'spider-woman',
  'spiral',
  'storm',
  'stryfe',
  'sub-zero',
  'sunder',
  'super-skrull',
  'swarm',
  'tarantula',
  'thanos',
  'thor',
  'tinkerer',
  'toad',
  'unus',
  'valkyrie',
  'vanisher',
  'venom',
  'vision',
  'vulture',
  'wasp',
  'whiz-kid',
  'wildpack',
  'wolfsbane',
  'wolverine',
  'wraith',
  'yellowjacket',
  'zero',
];
