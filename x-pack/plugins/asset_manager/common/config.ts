/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const INDEX_DEFAULTS = {
  logs: 'filebeat-*,logs-*,remote_cluster:filebeat-*,remote_cluster:logs-*',
  metrics: 'metrics-*,metricbeat-*,remote_cluster:metrics-*,remote_cluster:metricbeat-*',
  apm: {
    transaction: 'apm-*,traces-apm*,remote_cluster:apm-*,remote_cluster:traces-apm*',
    error: 'apm-*,logs-apm*,remote_cluster:apm-*,remote_cluster:logs-apm*',
    metric: 'apm-*,metrics-apm*,remote_cluster:apm-*,remote_cluster:metrics-apm*',
  },
};

export const configSchema = schema.object({
  alphaEnabled: schema.maybe(schema.boolean()),
  // Designate where various types of data live.
  // NOTE: this should be handled in a centralized way for observability, so
  // that when a user configures these differently from the known defaults,
  // that value is propagated everywhere. For now, we duplicate the value here.
  sourceIndices: schema.object(
    {
      logs: schema.string({ defaultValue: INDEX_DEFAULTS.logs }),
      metrics: schema.string({ defaultValue: INDEX_DEFAULTS.metrics }),
      apm: schema.object(
        {
          transaction: schema.string({ defaultValue: INDEX_DEFAULTS.apm.transaction }),
          error: schema.string({ defaultValue: INDEX_DEFAULTS.apm.error }),
          metric: schema.string({ defaultValue: INDEX_DEFAULTS.apm.metric }),
        },
        { defaultValue: INDEX_DEFAULTS.apm }
      ),
    },
    { defaultValue: INDEX_DEFAULTS }
  ),
  implicitCollection: schema.maybe(
    schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      interval: schema.duration({ defaultValue: '5m' }),
      input: schema.maybe(
        schema.object({
          hosts: schema.string(),
          username: schema.string(),
          password: schema.string(),
        })
      ),
      output: schema.maybe(
        schema.object({
          hosts: schema.string(),
          username: schema.string(),
          password: schema.string(),
        })
      ),
    })
  ),
});

export type AssetManagerConfig = TypeOf<typeof configSchema>;

/**
 * The following map is passed to the server plugin setup under the
 * exposeToBrowser: option, and controls which of the above config
 * keys are allow-listed to be available in the browser config.
 *
 * NOTE: anything exposed here will be visible in the UI dev tools,
 * and therefore MUST NOT be anything that is sensitive information!
 */
export const exposeToBrowserConfig = {
  alphaEnabled: true,
} as const;

type ValidKeys = keyof {
  [K in keyof typeof exposeToBrowserConfig as typeof exposeToBrowserConfig[K] extends true
    ? K
    : never]: true;
};

export type AssetManagerPublicConfig = Pick<AssetManagerConfig, ValidKeys>;
