/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema } from '@kbn/entities-schema';
export const builtInEntityDefinition = entityDefinitionSchema.parse({
  id: 'builtin_mock_entity_definition',
  version: '1.0.0',
  name: 'Mock builtin definition',
  type: 'service',
  indexPatterns: ['kbn-data-forge-fake_stack.*'],
  managed: true,
  history: {
    timestampField: '@timestamp',
    interval: '1m',
  },
  identityFields: ['log.logger', { field: 'event.category', optional: true }],
  displayNameTemplate: '{{log.logger}}{{#event.category}}:{{.}}{{/event.category}}',
  metadata: ['tags', 'host.name', 'host.os.name', { source: '_index', destination: 'sourceIndex' }],
  metrics: [],
});
