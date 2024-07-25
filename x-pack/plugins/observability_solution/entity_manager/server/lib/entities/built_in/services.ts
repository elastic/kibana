/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

const serviceTransactionFilter = (additionalFilters: string[] = []) => {
  const baseFilters = [
    'processor.event: "metric"',
    'metricset.name: "service_transaction"',
    'metricset.interval: "1m"',
  ];

  return [...baseFilters, ...additionalFilters].join(' AND ');
};

export const builtInServicesFromLogsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    version: '0.1.0',
    id: `${BUILT_IN_ID_PREFIX}services_from_ecs_data`,
    name: 'Services from ECS data',
    description:
      'This definition extracts service entities from common data streams by looking for the ECS field service.name',
    type: 'service',
    managed: true,
    filter: '@timestamp >= now-10m',
    indexPatterns: ['logs-*', 'filebeat*', 'metrics-apm.service_transaction.1m*'],
    history: {
      timestampField: '@timestamp',
      interval: '1m',
      settings: {
        frequency: '2m',
        syncDelay: '2m',
      },
    },
    latest: {
      lookback: '5m',
    },
    identityFields: ['service.name', { field: 'service.environment', optional: true }],
    displayNameTemplate: '{{service.name}}{{#service.environment}}:{{.}}{{/service.environment}}',
    metadata: [
      { source: '_index', destination: 'sourceIndex' },
      { source: 'agent.name', limit: 100 },
      'data_stream.type',
      'service.environment',
      'service.name',
      'service.namespace',
      'service.version',
      'service.runtime.name',
      'service.runtime.version',
      'service.language.name',
      'cloud.provider',
      'cloud.availability_zone',
      'cloud.machine.type',
    ],
    metrics: [
      {
        name: 'latency',
        equation: 'A',
        metrics: [
          {
            name: 'A',
            aggregation: 'avg',
            filter: serviceTransactionFilter(),
            field: 'transaction.duration.histogram',
          },
        ],
      },
      {
        name: 'throughput',
        equation: 'A',
        metrics: [
          {
            name: 'A',
            aggregation: 'value_count',
            filter: serviceTransactionFilter(),
            field: 'transaction.duration.summary',
          },
        ],
      },
      {
        name: 'failedTransactionRate',
        equation: '1 - (A / B)',
        metrics: [
          {
            name: 'A',
            aggregation: 'sum',
            filter: serviceTransactionFilter(),
            field: 'event.success_count',
          },
          {
            name: 'B',
            aggregation: 'value_count',
            filter: serviceTransactionFilter(),
            field: 'event.success_count',
          },
        ],
      },
      {
        name: 'logErrorRate',
        equation: 'A / B',
        metrics: [
          {
            name: 'A',
            aggregation: 'doc_count',
            filter: 'log.level: "error" OR error.log.level: "error"',
          },
          {
            name: 'B',
            aggregation: 'doc_count',
            filter: 'log.level: * OR error.log.level: *',
          },
        ],
      },
      {
        name: 'logRate',
        equation: 'A',
        metrics: [
          {
            name: 'A',
            aggregation: 'doc_count',
            filter: 'log.level: * OR error.log.level: *',
          },
        ],
      },
    ],
  });
