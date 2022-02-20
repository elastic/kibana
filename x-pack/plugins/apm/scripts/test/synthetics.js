/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const { times } = require('lodash');
const path = require('path');
const yargs = require('yargs');
const childProcess = require('child_process');

const { argv } = yargs(process.argv.slice(2))
  .option('kibana-install-dir', {
    default: '',
    type: 'string',
    description: 'Path to the Kibana install directory',
  })
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Start Elasticsearch and Kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description:
      'Run all tests (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('grep', {
    alias: 'spec',
    default: false,
    type: 'string',
    description:
      'Specify the spec files to run (use doublequotes for glob matching)',
  })
  .option('bail', {
    default: false,
    type: 'boolean',
    description: 'stop tests after the first failure',
  })
  .option('times', {
    default: 1,
    type: 'number',
    description: 'Repeat the test n number of times',
  })
  .option('headless', {
    default: true,
    type: 'boolean',
    description: 'Start in headless mode',
  })
  .help();

const { server, runner, grep, bail, headless, kibanaInstallDir } = argv;

const e2eDir = path.join(__dirname, '../../e2e');

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner) {
  ftrScript = `functional_test_runner --headless ${headless}`;
}

const config = './playwright_run.ts';
const grepArg = grep ? `--grep "${grep}"` : '';
const bailArg = bail ? `--bail` : '';
const cmd = `node ../../../../scripts/${ftrScript} --config ${config} ${grepArg} ${bailArg} --kibana-install-dir '${kibanaInstallDir}'`;

console.log(`Running "${cmd}"`);

if (argv.times > 1) {
  console.log(`The command will be executed ${argv.times} times`);
}

const runCounter = { succeeded: 0, failed: 0, remaining: argv.times };
times(argv.times, () => {
  try {
    childProcess.execSync(cmd, { cwd: e2eDir, stdio: 'inherit' });
    runCounter.succeeded++;
  } catch (e) {
    runCounter.failed++;
  }
  runCounter.remaining--;

  if (argv.times > 1) {
    console.log(runCounter);
  }
});
