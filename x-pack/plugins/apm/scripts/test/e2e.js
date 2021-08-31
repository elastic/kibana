/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const yargs = require('yargs');
const runFTRScript = require('./ftr');

const { argv } = yargs(process.argv.slice(2))
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Start Elasticsearch and kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description:
      'Run all tests (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('open', {
    default: false,
    type: 'boolean',
    description: 'Opens the Cypress Test Runner',
  })
  .help();

const { server, runner, open } = argv;

runFTRScript({
  server,
  runner: runner || open,
  configScript: open
    ? '../../ftr_e2e/cypress_open.ts'
    : '../../ftr_e2e/cypress_run.ts',
});
