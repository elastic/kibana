/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');

process.chdir(resolve(__dirname, '../../../..'));
process.argv.splice(2, 0, 'x-pack/plugins/canvas/**/*.{js,jsx}');

require('../../../../scripts/eslint');
