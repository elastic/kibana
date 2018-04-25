/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import path from 'path';

export function args({ bridgePort }) {
  return [
    '--load-images=true',
    '--ssl-protocol=any',
    '--ignore-ssl-errors=true',
    path.join(__dirname, 'node-phantom-simple', 'bridge.js'),
    '127.0.0.1',
    bridgePort
  ];
}
