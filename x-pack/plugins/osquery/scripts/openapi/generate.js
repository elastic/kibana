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
const { REPO_ROOT } = require('@kbn/repo-info');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join, resolve } = require('path');

const OSQUERY_ROOT = resolve(__dirname, '../..');

(async () => {
  await generate({
    title: 'API route schemas',
    rootDir: OSQUERY_ROOT,
    sourceGlob: 'common/api/**/*.schema.yaml',
    templateName: 'zod_operation_schema',
  });

  await generate({
    title: 'API client for tests',
    rootDir: OSQUERY_ROOT,
    sourceGlob: 'common/api/**/*.schema.yaml',
    templateName: 'api_client_supertest',
    skipLinting: true,
    bundle: {
      outFile: join(
        REPO_ROOT,
        'x-pack/test/api_integration/services/security_solution_osquery_api.gen.ts'
      ),
    },
  });
})();
