/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
const { join, resolve } = require('path');

const SECURITY_SOLUTION_ROOT = resolve(__dirname, '../..');

bundle({
  sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/**/*.schema.yaml'),
  outputFilePath: join(
    SECURITY_SOLUTION_ROOT,
    'target/openapi/serverless/security_solution-{version}.bundled.schema.yaml'
  ),
  options: {
    includeLabels: ['serverless'],
  },
});

bundle({
  sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/**/*.schema.yaml'),
  outputFilePath: join(
    SECURITY_SOLUTION_ROOT,
    'target/openapi/ess/security_solution-{version}.bundled.schema.yaml'
  ),
  options: {
    includeLabels: ['ess'],
  },
});
