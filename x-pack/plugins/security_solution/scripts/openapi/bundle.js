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
  sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/endpoint/**/*.schema.yaml'),
  outputFilePath: join(
    SECURITY_SOLUTION_ROOT,
    'docs/openapi/serverless/security_solution_endpoint_{version}.bundled.schema.yaml'
  ),
  specInfo: {
    title: 'Endpoint management API',
    description:
      'Endpoint management APIs allow you to interact with and manage endpoints running the Elastic Defend integration.',
  },
});

bundle({
  sourceGlob: join(SECURITY_SOLUTION_ROOT, 'common/api/detection_engine/**/*.schema.yaml'),
  outputFilePath: join(
    SECURITY_SOLUTION_ROOT,
    'docs/openapi/serverless/security_solution_detection_engine_{version}.bundled.schema.yaml'
  ),
  specInfo: {
    title: 'Detections API',
    description:
      'You can create rules that automatically turn events and external alerts sent to Elastic Security into detection alerts. These alerts are displayed on the Detections page.',
  },
});
