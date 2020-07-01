/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');
const execa = require('execa');

const options = {
  stdio: ['ignore', 'inherit', 'inherit'],
  buffer: false,
};

const hrstart = process.hrtime();

const childProcess = execa.node('scripts/type_check', ['--project', 'x-pack/tsconfig.json'], {
  cwd: resolve(__dirname, '../../../..'),
  ...options,
});

childProcess.finally(() => {
  const hrend = process.hrtime(hrstart);
  console.info('Execution time: %ds %dms', hrend[0]);
});
