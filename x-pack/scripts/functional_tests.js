/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { ALL, FOR_COVERAGE } = require('../test/all_configs.js');

require('@kbn/plugin-helpers').babelRegister();
require('@kbn/test').runTestsCli(process.env.CODE_COVERAGE ? FOR_COVERAGE : ALL);
