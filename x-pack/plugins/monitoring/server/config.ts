/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { config } from '../../../../src/core/server';
// TODO: NP
// import { XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS } from '../common/constants';
const XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS = 30001;
const elasticsearchConfigSchema = config.elasticsearch.schema;

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  elasticsearch: elasticsearchConfigSchema,
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    ccs: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    logs: schema.object({
      index: schema.string({ defaultValue: 'filebeat-*' }),
    }),
    max_bucket_size: schema.number({ defaultValue: 10000 }),
    elasticsearch: elasticsearchConfigSchema,
    container: schema.object({
      elasticsearch: schema.object({
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
  xpack_api_polling_frequency_millis: schema.number({
    defaultValue: XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS,
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

export type MonitoringConfig = TypeOf<typeof configSchema>;
