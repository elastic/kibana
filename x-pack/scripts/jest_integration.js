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

const resolve = require('path').resolve;
process.argv.push('--config', resolve(__dirname, '../test_utils/jest/config.integration.js'));

require('../../src/setup_node_env');
require('../../src/dev/jest/cli');
