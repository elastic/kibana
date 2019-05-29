/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// # Run Jest integration tests
//
// All args will be forwarded directly to Jest, e.g. to watch tests run:
//
//     node scripts/jest_integration --watch
//
// or to build code coverage:
//
//     node scripts/jest_integration --coverage
//
// See all cli options in https://facebook.github.io/jest/docs/cli.html

throw new Error(`
  jest_integration tests have been disabled because of a flaky failure in the
  example integration test: https://github.com/elastic/kibana/issues/32795#issuecomment-471585274

  when un-skipping these tests make sure to uncomment test/scripts/jenkins_xpack.sh lines 33-37
`);

const resolve = require('path').resolve;
process.argv.push('--config', resolve(__dirname, '../test_utils/jest/config.integration.js'));
process.argv.push('--runInBand');

require('../../src/setup_node_env');
require('../../src/dev/jest/cli');
