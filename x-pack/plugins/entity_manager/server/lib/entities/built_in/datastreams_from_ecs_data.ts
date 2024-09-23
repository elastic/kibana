/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInDataStreamsFromEcsDefinition: EntityDefinition = entityDefinitionSchema.parse({
  version: '1.0.0',
  id: `${BUILT_IN_ID_PREFIX}data_streams_from_ecs_data`,
  name: 'Data streams',
  description: 'This definition extracts data streams',
  type: 'data_stream',
  managed: true,
  indexPatterns: ['logs-*', '*:logs-*', 'metrics-*', '*:metrics-*', 'traces-*', '*:traces-*'],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
    settings: {
      lookbackPeriod: '10m',
      frequency: '2m',
      syncDelay: '2m',
    },
  },
  identityFields: ['data_stream.type', 'data_stream.dataset', 'data_stream.namespace'],
  metadata: [{ source: '_index', destination: 'sourceIndex', limit: 10 }],
  displayNameTemplate:
    '{{remote}}{{data_stream.type}}-{{data_stream.dataset}}-{{data_stream.namespace}}',
  metrics: [
    {
      name: 'logRate',
      equation: 'A',
      metrics: [
        {
          name: 'A',
          aggregation: 'doc_count',
        },
      ],
    },
    {
      name: 'logErrorRate',
      equation: 'A',
      metrics: [
        {
          name: 'A',
          aggregation: 'doc_count',
          filter: 'log.level: "ERROR" or log.level: "error"',
        },
      ],
    },
  ],
});
