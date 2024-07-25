/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');
const { bundle } = require('@kbn/openapi-bundler');
const { join, resolve } = require('path');

const ROOT = resolve(__dirname, '../..');

bundle({
  sourceGlob: join(ROOT, 'common/api/entity_analytics/**/*.schema.yaml'),
  outputFilePath: join(
    ROOT,
    'docs/openapi/serverless/security_solution_entity_analytics_api_{version}.bundled.schema.yaml'
  ),
  options: {
    includeLabels: ['serverless'],
    specInfo: {
      title: 'Security Solution Entity Analytics API (Elastic Cloud Serverless)',
      description: '',
    },
  },
});

bundle({
  sourceGlob: join(ROOT, 'common/api/entity_analytics/**/*.schema.yaml'),
  outputFilePath: join(
    ROOT,
    'docs/openapi/ess/security_solution_entity_analytics_api_{version}.bundled.schema.yaml'
  ),
  options: {
    includeLabels: ['ess'],
    specInfo: {
      title: 'Security Solution Entity Analytics API (Elastic Cloud and self-hosted)',
      description: '',
    },
  },
});
