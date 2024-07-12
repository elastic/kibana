/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInServicesEntityDefinition: EntityDefinition = entityDefinitionSchema.parse({
  id: `${BUILT_IN_ID_PREFIX}services`,
  version: '0.1.0',
  name: 'Services from logs',
  type: 'service',
  managed: true,
  indexPatterns: ['logs-*', 'filebeat*'],
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  latest: {
    lookback: '5m',
  },
  identityFields: ['service.name', { field: 'service.environment', optional: true }],
  displayNameTemplate: '{{service.name}}{{#service.environment}}:{{.}}{{/service.environment}}',
  metadata: [
    { source: '_index', destination: 'sourceIndex' },
    'data_stream.type',
    'service.instance.id',
    'service.namespace',
    'service.version',
    'service.runtime.name',
    'service.runtime.version',
    'service.node.name',
    'service.language.name',
    'agent.name',
    'cloud.provider',
    'cloud.instance.id',
    'cloud.availability_zone',
    'cloud.instance.name',
    'cloud.machine.type',
    'host.name',
    'container.id',
  ],
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
          filter: 'log.level: "ERROR"',
        },
      ],
    },
  ],
});
