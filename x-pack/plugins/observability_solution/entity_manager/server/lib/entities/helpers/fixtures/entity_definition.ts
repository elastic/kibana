/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema } from '@kbn/entities-schema';
export const rawEntityDefinition = {
  id: 'admin-console-services',
  version: '999.999.999',
  name: 'Services for Admin Console',
  type: 'service',
  indexPatterns: ['kbn-data-forge-fake_stack.*'],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  identityFields: ['log.logger', { field: 'event.category', optional: true }],
  displayNameTemplate: '{{log.logger}}{{#event.category}}:{{.}}{{/event.category}}',
  metadata: ['tags', 'host.name', 'host.os.name', { source: '_index', destination: 'sourceIndex' }],
  metrics: [
    {
      name: 'logRate',
      equation: 'A',
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
      equation: 'A',
      metrics: [
        {
          name: 'A',
          aggregation: 'doc_count',
          filter: 'log.level: "ERROR"',
        },
      ],
    },
  ],
};
export const entityDefinition = entityDefinitionSchema.parse(rawEntityDefinition);
