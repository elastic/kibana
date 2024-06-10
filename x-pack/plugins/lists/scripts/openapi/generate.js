/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { resolve, join } = require('path');

const { generate } = require('@kbn/openapi-generator');
const { REPO_ROOT } = require('@kbn/repo-info');

const PLUGIN_ROOT = resolve(__dirname, '../..');

(async () => {
  await generate({
    title: 'Lists API route schemas',
    rootDir: PLUGIN_ROOT,
    sourceGlob: './**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });

  await generate({
    title: 'Lists API client for tests',
    rootDir: PLUGIN_ROOT,
    sourceGlob: './**/*.schema.yaml',
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(REPO_ROOT, 'x-pack/test/api_integration/services/lists_api.gen.ts'),
    },
  });
})();
