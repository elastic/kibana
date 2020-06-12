/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });
const DEFAULT_API_VERSION = 'master';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  elasticsearch: schema.object({
    logFetchCount: schema.number({ defaultValue: 10 }),
    sniffOnStart: schema.boolean({ defaultValue: false }),
    sniffInterval: schema.oneOf([schema.duration(), schema.literal(false)], {
      defaultValue: false,
    }),
    sniffOnConnectionFault: schema.boolean({ defaultValue: false }),
    hosts: schema.maybe(
      schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })])
    ),
    preserveHost: schema.boolean({ defaultValue: true }),
    username: schema.maybe(
      schema.conditional(
        schema.contextRef('dist'),
        false,
        schema.string({
          validate: () => {},
        }),
        schema.string()
      )
    ),
    password: schema.maybe(schema.string()),
    requestHeadersWhitelist: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
      defaultValue: ['authorization'],
    }),
    customHeaders: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
    shardTimeout: schema.duration({ defaultValue: '30s' }),
    requestTimeout: schema.duration({ defaultValue: '30s' }),
    pingTimeout: schema.duration({ defaultValue: schema.siblingRef('requestTimeout') }),
    startupTimeout: schema.duration({ defaultValue: '5s' }),
    logQueries: schema.boolean({ defaultValue: false }),
    ssl: schema.object(
      {
        verificationMode: schema.oneOf(
          [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
          { defaultValue: 'full' }
        ),
        certificateAuthorities: schema.maybe(
          schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
        ),
        certificate: schema.maybe(schema.string()),
        key: schema.maybe(schema.string()),
        keyPassphrase: schema.maybe(schema.string()),
        keystore: schema.object({
          path: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
        }),
        truststore: schema.object({
          path: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
        }),
        alwaysPresentCertificate: schema.boolean({ defaultValue: false }),
      },
      {
        validate: (rawConfig) => {
          if (rawConfig.key && rawConfig.keystore.path) {
            return 'cannot use [key] when [keystore.path] is specified';
          }
          if (rawConfig.certificate && rawConfig.keystore.path) {
            return 'cannot use [certificate] when [keystore.path] is specified';
          }
        },
      }
    ),
    apiVersion: schema.string({ defaultValue: DEFAULT_API_VERSION }),
    healthCheck: schema.object({ delay: schema.duration({ defaultValue: 2500 }) }),
    ignoreVersionMismatch: schema.conditional(
      schema.contextRef('dev'),
      false,
      schema.boolean({
        validate: (rawValue) => {
          if (rawValue === true) {
            return '"ignoreVersionMismatch" can only be set to true in development mode';
          }
        },
        defaultValue: false,
      }),
      schema.boolean({ defaultValue: false })
    ),
  }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    ccs: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    logs: schema.object({
      index: schema.string({ defaultValue: 'filebeat-*' }),
    }),
    max_bucket_size: schema.number({ defaultValue: 10000 }),
    elasticsearch: schema.object({
      logFetchCount: schema.number({ defaultValue: 10 }),
      sniffOnStart: schema.boolean({ defaultValue: false }),
      sniffInterval: schema.oneOf([schema.duration(), schema.literal(false)], {
        defaultValue: false,
      }),
      sniffOnConnectionFault: schema.boolean({ defaultValue: false }),
      hosts: schema.maybe(
        schema.oneOf([hostURISchema, schema.arrayOf(hostURISchema, { minSize: 1 })])
      ),
      preserveHost: schema.boolean({ defaultValue: true }),
      username: schema.maybe(
        schema.conditional(
          schema.contextRef('dist'),
          false,
          schema.string({
            validate: (rawConfig) => {
              if (rawConfig === 'elastic') {
                return (
                  'value of "elastic" is forbidden. This is a superuser account that can obfuscate ' +
                  'privilege-related issues. You should use the "kibana_system" user instead.'
                );
              }
            },
          }),
          schema.string()
        )
      ),
      password: schema.maybe(schema.string()),
      requestHeadersWhitelist: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
        defaultValue: ['authorization'],
      }),
      customHeaders: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
      shardTimeout: schema.duration({ defaultValue: '30s' }),
      requestTimeout: schema.duration({ defaultValue: '30s' }),
      pingTimeout: schema.duration({ defaultValue: schema.siblingRef('requestTimeout') }),
      startupTimeout: schema.duration({ defaultValue: '5s' }),
      logQueries: schema.boolean({ defaultValue: false }),
      ssl: schema.object(
        {
          verificationMode: schema.oneOf(
            [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
            { defaultValue: 'full' }
          ),
          certificateAuthorities: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
          ),
          certificate: schema.maybe(schema.string()),
          key: schema.maybe(schema.string()),
          keyPassphrase: schema.maybe(schema.string()),
          keystore: schema.object({
            path: schema.maybe(schema.string()),
            password: schema.maybe(schema.string()),
          }),
          truststore: schema.object({
            path: schema.maybe(schema.string()),
            password: schema.maybe(schema.string()),
          }),
          alwaysPresentCertificate: schema.boolean({ defaultValue: false }),
        },
        {
          validate: (rawConfig) => {
            if (rawConfig.key && rawConfig.keystore.path) {
              return 'cannot use [key] when [keystore.path] is specified';
            }
            if (rawConfig.certificate && rawConfig.keystore.path) {
              return 'cannot use [certificate] when [keystore.path] is specified';
            }
          },
        }
      ),
      apiVersion: schema.string({ defaultValue: DEFAULT_API_VERSION }),
      healthCheck: schema.object({ delay: schema.duration({ defaultValue: 2500 }) }),
      ignoreVersionMismatch: schema.conditional(
        schema.contextRef('dev'),
        false,
        schema.boolean({
          validate: (rawValue) => {
            if (rawValue === true) {
              return '"ignoreVersionMismatch" can only be set to true in development mode';
            }
          },
          defaultValue: false,
        }),
        schema.boolean({ defaultValue: false })
      ),
    }),
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

export type MonitoringConfig = TypeOf<typeof configSchema>;
