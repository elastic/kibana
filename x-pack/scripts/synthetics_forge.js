/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
const { spawnSync } = require('node:child_process');

const childProcess = spawnSync(
  process.execPath,
  [
    '-e',
    "require('@kbn/setup-node-env'); Promise.resolve(require('@kbn/synthetics-forge').cli()).catch((error) => { console.error(error); process.exitCode = 1; });",
    'synthetics_forge.js',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: process.env,
  }
);

if (childProcess.error) {
  throw childProcess.error;
}

if (childProcess.signal) {
  process.kill(process.pid, childProcess.signal);
} else {
  process.exitCode = childProcess.status ?? 1;
}
