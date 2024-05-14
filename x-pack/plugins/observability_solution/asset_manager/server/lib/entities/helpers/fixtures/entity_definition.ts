/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema } from '@kbn/oam-schema';
export const entityDefinition = entityDefinitionSchema.parse({
  id: 'admin-console-logs-service',
  name: 'Services for Admin Console',
  type: 'service',
  indexPatterns: ['kbn-data-forge-fake_stack.*'],
  timestampField: '@timestamp',
  identityFields: ['log.logger'],
  identityTemplate: 'service:{{log.logger}}',
  metadata: ['tags', 'host.name', 'kubernetes.pod.name'],
  staticFields: {
    projectId: '1234',
  },
  lookback: '5m',
  metrics: [
    {
      name: 'logRate',
      equation: 'A / 5',
      metrics: [
        {
          name: 'A',
          aggregation: 'doc_count',
          filter: 'log.level: *',
        },
      ],
    },
    {
      name: 'errorRate',
      equation: 'A / 5',
      metrics: [
        {
          name: 'A',
          aggregation: 'doc_count',
          filter: 'log.level: error',
        },
      ],
    },
  ],
});
