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

(async () => {
  await bundle({
    sourceGlob: join(ROOT, 'common/api/detection_engine/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_detections_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Detections API (Elastic Cloud Serverless)',
          description:
            'You can create rules that automatically turn events and external alerts sent to Elastic Security into detection alerts. These alerts are displayed on the Detections page.',
        },
        tags: [
          {
            name: 'Security Detections API',
            'x-displayName': 'Security detections',
            description:
              'You can create rules that automatically turn events and external alerts sent to Elastic Security into detection alerts. These alerts are displayed on the Detections page.',
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'common/api/detection_engine/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_detections_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Detections API (Elastic Cloud and self-hosted)',
          description:
            'You can create rules that automatically turn events and external alerts sent to Elastic Security into detection alerts. These alerts are displayed on the Detections page.',
        },
        tags: [
          {
            name: 'Security Detections API',
            'x-displayName': 'Security detections',
            description:
              'You can create rules that automatically turn events and external alerts sent to Elastic Security into detection alerts. These alerts are displayed on the Detections page.',
          },
        ],
      },
    },
  });
})();
