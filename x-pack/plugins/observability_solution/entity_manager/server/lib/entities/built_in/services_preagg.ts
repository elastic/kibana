/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInServicesPreaggEntityDefinition: EntityDefinition = entityDefinitionSchema.parse(
  {
    id: `${BUILT_IN_ID_PREFIX}services_preagg_metrics`,
    name: 'Services from logs',
    type: 'service',
    managed: true,
    filter: '@timestamp > now-5m',
    indexPatterns: [
      'logs-*',
      'filebeat*',
      'apm*',
      'metrics-*',
      'remote_cluster:logs*',
      'remote_cluster:filebeat*',
      'remote_cluster:apm*',
      'remote_cluster:metrics-*',
    ],
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
            filter: 'processor.event: "metric" AND metricset.name: "transaction"',
            field: 'transaction.duration.histogram',
          },
        ],
      },
      {
        name: 'throughput',
        equation: 'A / 5',
        metrics: [
          {
            name: 'A',
            aggregation: 'doc_count',
            filter: 'processor.event: "metric" AND metricset.name: "transaction"',
          },
        ],
      },
      {
        name: 'failedTransactionRate',
        equation: 'A / B',
        metrics: [
          {
            name: 'A',
            aggregation: 'doc_count',
            filter:
              'processor.event: "metric" AND metricset.name: "transaction" AND event.outcome: "failure"',
          },
          {
            name: 'B',
            aggregation: 'doc_count',
            filter:
              'processor.event: "metric" AND metricset.name: "transaction" AND event.outcome: *',
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
        equation: 'A / 5',
        metrics: [
          {
            name: 'A',
            aggregation: 'doc_count',
            filter: 'log.level: * OR error.log.level: *',
          },
        ],
      },
    ],
  }
);
