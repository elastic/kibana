/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
const { join } = require('path');

const SECURITY_SOLUTION_ROOT = join(__dirname, '..', '..');

bundle({
  sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/**/*.schema.yaml'),
  outputFilePath: join(
    SECURITY_SOLUTION_ROOT,
    'docs/openapi/serverless/security_solution_{version}.bundled.schema.yaml'
  ),
  specInfo: {
    title: 'Elastic Security APIs',
    description: 'You can use these APIs to interface with Elastic Security features.',
  },
});
