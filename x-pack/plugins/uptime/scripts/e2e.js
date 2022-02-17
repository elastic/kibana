/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const path = require('path');
const yargs = require('yargs');
const childProcess = require('child_process');

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
    description: 'Opens the Playwright Test Runner',
  })
  .option('kibana-install-dir', {
    default: '',
    type: 'string',
    description: 'Path to the Kibana install directory',
  })
  .option('headless', {
    default: true,
    type: 'boolean',
    description: 'Start in headless mode',
  })
  .option('grep', {
    default: undefined,
    type: 'string',
    description: 'run only journeys with a name or tags that matches the glob',
  })
  .help();

const { server, runner, open, kibanaInstallDir, headless, grep } = argv;

const e2eDir = path.join(__dirname, '../e2e');

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner || open) {
  ftrScript = 'functional_test_runner';
}

const config = './playwright_run.ts';

function executeRunner() {
  if (server) {
    childProcess.execSync(
      `node ../../../scripts/${ftrScript} --config ${config} --kibana-install-dir '${kibanaInstallDir}'`,
      {
        cwd: e2eDir,
        stdio: 'inherit',
      }
    );
  } else if (runner) {
    childProcess.execSync(
      `node ../../../scripts/${ftrScript} --config ${config} --kibana-install-dir '${kibanaInstallDir}'  --headless ${headless} --grep '${grep}'`,
      {
        cwd: e2eDir,
        stdio: 'inherit',
      }
    );
  } else {
    childProcess.execSync(
      `node ../../../scripts/${ftrScript} --config ${config} --kibana-install-dir '${kibanaInstallDir}' --grep '${grep}'`,
      {
        cwd: e2eDir,
        stdio: 'inherit',
      }
    );
  }
}
executeRunner();
