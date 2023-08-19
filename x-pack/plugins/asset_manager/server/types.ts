/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core/server';

export interface ElasticsearchAccessorOptions {
  esClient: ElasticsearchClient;
}

export const INDEX_DEFAULTS = {
  metrics: 'metricbeat-*,metrics-*',
  logs: 'filebeat-*,logs-*',
  traces: 'traces-*',
  serviceMetrics: 'metrics-apm*',
  serviceLogs: 'logs-apm*',
};

export const configSchema = schema.object({
  alphaEnabled: schema.maybe(schema.boolean()),
  // Designate where various types of data live.
  // NOTE: this should be handled in a centralized way for observability, so
  // that when a user configures these differently from the known defaults,
  // that value is propagated everywhere. For now, we duplicate the value here.
  sourceIndices: schema.object(
    {
      metrics: schema.string({ defaultValue: INDEX_DEFAULTS.metrics }),
      logs: schema.string({ defaultValue: INDEX_DEFAULTS.logs }),
      traces: schema.string({ defaultValue: INDEX_DEFAULTS.traces }),
      serviceMetrics: schema.string({ defaultValue: INDEX_DEFAULTS.serviceMetrics }),
      serviceLogs: schema.string({ defaultValue: INDEX_DEFAULTS.serviceLogs }),
    },
    { defaultValue: INDEX_DEFAULTS }
  ),
  // Choose an explicit source for asset queries.
  // NOTE: This will eventually need to be able to cleverly switch
  // between these values based on the availability of data in the
  // indices, and possibly for each asset kind/type value.
  // For now, we set this explicitly.
  lockedSource: schema.oneOf([schema.literal('assets'), schema.literal('signals')], {
    defaultValue: 'signals',
  }),
});

export type AssetManagerConfig = TypeOf<typeof configSchema>;
