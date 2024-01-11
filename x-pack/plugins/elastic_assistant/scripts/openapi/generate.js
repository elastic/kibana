/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { generate } = require('@kbn/openapi-generator');
const { resolve } = require('path');

const ELASTIC_ASSISTANT_ROOT = resolve(__dirname, '../..');
const ELASTIC_ASSISTANT_COMMON_OUTPUT = resolve(
  `${ELASTIC_ASSISTANT_ROOT}/../../packages/kbn-elastic-assistant-common/impl`
);

generate({
  rootDir: ELASTIC_ASSISTANT_ROOT,
  sourceGlob: './server/schemas/**/*.schema.yaml',
  templateName: 'zod_operation_schema',
  outputDirTypes: ELASTIC_ASSISTANT_COMMON_OUTPUT,
});
