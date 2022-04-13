/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  config as ElasticsearchBaseConfig,
  ElasticsearchConfig,
} from '../../../../src/core/server/';
import { MonitoringConfigSchema } from './types';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

const elasticsearchConfigSchema = ElasticsearchBaseConfig.elasticsearch.schema;
type ElasticsearchConfigType = TypeOf<typeof elasticsearchConfigSchema>;

export const monitoringElasticsearchConfigSchema = elasticsearchConfigSchema.extends({
  logFetchCount: schema.number({ defaultValue: 10 }),
  hosts: schema.maybe(schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })])),
});

export const configSchema = schema.object({
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    debug_mode: schema.boolean({ defaultValue: false }),
    debug_log_path: schema.string({ defaultValue: '' }),
    ccs: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    logs: schema.object({
      index: schema.string({ defaultValue: 'filebeat-*' }),
    }),
    metricbeat: schema.object({
      index: schema.string({ defaultValue: 'metricbeat-*' }),
    }),
    max_bucket_size: schema.number({ defaultValue: 10000 }),
    elasticsearch: monitoringElasticsearchConfigSchema,
    container: schema.object({
      elasticsearch: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      apm: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      logstash: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    min_interval_seconds: schema.number({ defaultValue: 10 }),
    show_license_expiration: schema.boolean({ defaultValue: true }),
  }),
  kibana: schema.object({
    collection: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      interval: schema.number({ defaultValue: 10000 }), // op status metrics get buffered at `ops.interval` and flushed to the bulk endpoint at this interval
    }),
  }),
  cluster_alerts: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    email_notifications: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      email_address: schema.string({ defaultValue: '' }),
    }),
  }),
  licensing: schema.object({
    api_polling_frequency: schema.duration({
      defaultValue: '30s',
    }),
  }),
  agent: schema.object({
    interval: schema.string({ defaultValue: '10s' }),
    // TOOD: NP
    // .regex(/[\d\.]+[yMwdhms]/)
  }),
  tests: schema.object({
    cloud_detector: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  }),
});

export class MonitoringElasticsearchConfig extends ElasticsearchConfig {
  public readonly logFetchCount: number;

  constructor(rawConfig: TypeOf<typeof monitoringElasticsearchConfigSchema>) {
    super(rawConfig as ElasticsearchConfigType);
    this.logFetchCount = rawConfig.logFetchCount;
  }
}

// Build MonitoringConfig type based on MonitoringConfigSchema (config input) but with ui.elasticsearch as a MonitoringElasticsearchConfig (instantiated class)
type MonitoringConfigTypeOverriddenUI = Omit<MonitoringConfigSchema, 'ui'>;

interface MonitoringConfigTypeOverriddenUIElasticsearch
  extends Omit<MonitoringConfigSchema['ui'], 'elasticsearch'> {
  elasticsearch: MonitoringElasticsearchConfig;
}

/**
 * A functional representation of the `monitoring.*` configuration tree passed in from kibana.yml
 */
export interface MonitoringConfig extends MonitoringConfigTypeOverriddenUI {
  /**
   * A functional representation of the `monitoring.ui.*` configuration tree passed in from kibana.yml
   */
  ui: MonitoringConfigTypeOverriddenUIElasticsearch;
}

export function createConfig(config: MonitoringConfigSchema): MonitoringConfig {
  return {
    ...config,
    ui: {
      ...config.ui,
      elasticsearch: new MonitoringElasticsearchConfig(config.ui.elasticsearch),
    },
  };
}
