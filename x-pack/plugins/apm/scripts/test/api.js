/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
const { times } = require('lodash');
const yargs = require('yargs');
const path = require('path');
const childProcess = require('child_process');

const { argv } = yargs(process.argv.slice(2))
  .option('basic', {
    default: false,
    type: 'boolean',
    description: 'Run tests with basic license',
  })
  .option('trial', {
    default: false,
    type: 'boolean',
    description: 'Run tests with trial license',
  })
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Only start ES and Kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description: 'Only run tests',
  })
  .option('grep', {
    alias: 'spec',
    type: 'string',
    description: 'Specify the specs to run',
  })
  .option('grep-files', {
    alias: 'files',
    type: 'string',
    description: 'Specify the files to run',
  })
  .option('inspect', {
    default: false,
    type: 'boolean',
    description: 'Add --inspect-brk flag to the ftr for debugging',
  })
  .option('times', {
    type: 'number',
    description: 'Repeat the test n number of times',
  })
  .option('updateSnapshots', {
    default: false,
    type: 'boolean',
    description: 'Update snapshots',
  })
  .check((argv) => {
    const { inspect, runner } = argv;
    if (inspect && !runner) {
      throw new Error('--inspect can only be used with --runner');
    } else {
      return true;
    }
  })
  .help();

const {
  basic,
  trial,
  server,
  runner,
  grep,
  grepFiles,
  inspect,
  updateSnapshots,
} = argv;

if (trial === false && basic === false) {
  throw new Error('Please specify either --trial or --basic');
}

const license = trial ? 'trial' : 'basic';

console.log(`License: ${license}`);

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner) {
  ftrScript = 'functional_test_runner';
}

const cmd = [
  'node',
  ...(inspect ? ['--inspect-brk'] : []),
  `../../../../../scripts/${ftrScript}`,
  ...(grep ? [`--grep "${grep}"`] : []),
  ...(updateSnapshots ? [`--updateSnapshots`] : []),
  `--config ../../../../test/apm_api_integration/${license}/config.ts`,
].join(' ');

console.log(`Running: "${cmd}"`);

function runTests() {
  childProcess.execSync(cmd, {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: { ...process.env, APM_TEST_GREP_FILES: grepFiles },
  });
}

if (argv.times) {
  const runCounter = { succeeded: 0, failed: 0, remaining: argv.times };
  let exitStatus = 0;
  times(argv.times, () => {
    try {
      runTests();
      runCounter.succeeded++;
    } catch (e) {
      exitStatus = 1;
      runCounter.failed++;
    }
    runCounter.remaining--;
    if (argv.times > 1) {
      console.log(runCounter);
    }
  });
  process.exit(exitStatus);
} else {
  runTests();
}
