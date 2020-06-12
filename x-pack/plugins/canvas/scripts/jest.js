/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { run } = require('@kbn/dev-utils');
const { runXPackScript } = require('./_helpers');

// Due to https://github.com/facebook/jest/issues/7267, folders that start with `.`
// are ignored if using watchman.  Disabling watchman makes testing slow.  So
// we're making this script allow
run(
  ({ log, flags }) => {
    const { all, storybook, update, coverage } = flags;
    let { path } = flags;
    let options = [];
    process.argv.splice(2, process.argv.length - 2);

    if (path) {
      log.info(`Limiting tests to ${path}...`);
      path = 'plugins/canvas/' + path;
    } else {
      path = 'plugins/canvas';
    }

    if (coverage) {
      log.info(`Collecting test coverage and writing to canvas/coverage...`);
      options = [
        '--coverage',
        '--collectCoverageFrom', // Ignore TS definition files
        `!${path}/**/*.d.ts`,
        '--collectCoverageFrom', // Ignore build directories
        `!${path}/**/build/**`,
        '--collectCoverageFrom', // Ignore coverage on test files
        `!${path}/**/__tests__/**/*`,
        '--collectCoverageFrom', // Ignore coverage on example files
        `!${path}/**/__examples__/**/*`,
        '--collectCoverageFrom', // Ignore flot files
        `!${path}/**/flot-charts/**`,
        '--collectCoverageFrom', // Ignore coverage files
        `!${path}/**/coverage/**`,
        '--collectCoverageFrom', // Ignore scripts
        `!${path}/**/scripts/**`,
        '--collectCoverageFrom', // Ignore mock files
        `!${path}/**/mocks/**`,
        '--collectCoverageFrom', // Include JS files
        `${path}/**/*.js`,
        '--collectCoverageFrom', // Include TS/X files
        `${path}/**/*.ts*`,
        '--coverageDirectory', // Output to canvas/coverage
        'plugins/canvas/coverage',
      ];
    }
    // Mitigation for https://github.com/facebook/jest/issues/7267
    if (all || storybook) {
      options = options.concat(['--no-cache', '--no-watchman']);
    }

    if (all) {
      log.info('Running all available tests. This will take a while...');
    } else if (storybook) {
      path = 'plugins/canvas/.storybook';
      log.info('Running Storybook Snapshot tests...');
    } else {
      log.info('Running tests. This does not include Storybook Snapshots...');
    }

    if (update) {
      log.info('Updating any Jest snapshots...');
      options.push('-u');
    }

    runXPackScript('jest', [path].concat(options));
  },
  {
    description: `
      Jest test runner for Canvas. By default, will not include Storybook Snapshots.
    `,
    flags: {
      boolean: ['all', 'storybook', 'update', 'coverage'],
      string: ['path'],
      help: `
        --all              Runs all tests and snapshots.  Slower.
        --storybook        Runs Storybook Snapshot tests only.
        --update           Updates Storybook Snapshot tests.
        --path <string>    Runs any tests at a given path.
        --coverage         Collect coverage statistics.
      `,
    },
  }
);
