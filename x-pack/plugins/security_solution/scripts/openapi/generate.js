/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { generate } = require('@kbn/openapi-generator');
const { REPO_ROOT } = require('@kbn/repo-info');
const { resolve, join } = require('path');

const SECURITY_SOLUTION_ROOT = resolve(__dirname, '../..');

(async () => {
  await generate({
    title: 'API route schemas',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: './**/*.schema.yaml',
    templateName: 'zod_operation_schema',
    skipLinting: true,
  });

  await generate({
    title: 'API client for tests',
    rootDir: SECURITY_SOLUTION_ROOT,
    sourceGlob: './**/*.schema.yaml',
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(REPO_ROOT, 'x-pack/test/api_integration/services/security_solution_api.gen.ts'),
    },
  });
})();
