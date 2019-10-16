/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function generateUUID(a) {
  // Taken from: https://gist.github.com/jed/982883
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
}

const generateIP = (() => {
  let counter = 1;
  return () => `172.31.0.${counter++}`;
})();

function generateEndpoint() {
  const ip = generateIP();
  const ipName = ip.replace(/\./g, '-');
  return {
    _index: 'endgame-hosts-full',
    _type: '_doc',
    _id: 'MDNEMURXF9-m1y181h_Qdc9JCsn8bQAA',
    _score: 1.0,
    alert_count: 3,
    _source: {
      agent: {
        id: generateUUID(),
        version: '3.52.12',
      },
      '@timestamp': '2019-10-16T17:29:30.000Z',
      host: {
        hostname: `adt-dhcp-${ipName}.eng.endgames.local`,
        os: {
          name: 'Windows',
          version: '10.0',
          platform: 'windows',
        },
        ip: ip,
        name: `adt-dhcp-${ipName}.eng.endgames.local`,
      },
    },
  };
}

export const endpoints = Array.from({ length: 50 }, () => generateEndpoint());
