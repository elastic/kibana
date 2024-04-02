/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generate } = require('@kbn/openapi-generator');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolve } = require('path');

const OSQUERY_ROOT = resolve(__dirname, '../..');

generate({
  rootDir: OSQUERY_ROOT,
  sourceGlob: './**/*.schema.yaml',
  templateName: 'zod_operation_schema',
  // TODO: Fix lint errors
  skipLinting: true,
});
