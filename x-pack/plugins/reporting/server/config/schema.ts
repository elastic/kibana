/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue, schema, TypeOf } from '@kbn/config-schema';
import moment from 'moment';

const KibanaServerSchema = schema.object({
  hostname: schema.maybe(schema.string({ hostname: true })),
  port: schema.maybe(schema.number()),
  protocol: schema.maybe(
    schema.string({
      validate(value) {
        if (!/^https?$/.test(value)) {
          return 'must be "http" or "https"';
        }
      },
    })
  ),
}); // default values are all dynamic in createConfig$

const QueueSchema = schema.object({
  indexInterval: schema.string({ defaultValue: 'week' }),
  pollEnabled: schema.boolean({ defaultValue: true }),
  pollInterval: schema.oneOf([schema.number(), schema.duration()], {
    defaultValue: moment.duration({ seconds: 3 }),
  }),
  pollIntervalErrorMultiplier: schema.number({ defaultValue: 10 }),
  timeout: schema.oneOf([schema.number(), schema.duration()], {
    defaultValue: moment.duration({ minutes: 2 }),
  }),
});

const RulesSchema = schema.object({
  allow: schema.boolean(),
  host: schema.maybe(schema.string()),
  protocol: schema.maybe(
    schema.string({
      validate(value) {
        if (!/:$/.test(value)) {
          return 'must end in colon';
        }
      },
    })
  ),
});

const CaptureSchema = schema.object({
  timeouts: schema.object({
    openUrl: schema.oneOf([schema.number(), schema.duration()], {
      defaultValue: moment.duration({ minutes: 1 }),
    }),
    waitForElements: schema.oneOf([schema.number(), schema.duration()], {
      defaultValue: moment.duration({ seconds: 30 }),
    }),
    renderComplete: schema.oneOf([schema.number(), schema.duration()], {
      defaultValue: moment.duration({ seconds: 30 }),
    }),
  }),
  networkPolicy: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    rules: schema.arrayOf(RulesSchema, {
      defaultValue: [
        { host: undefined, allow: true, protocol: 'http:' },
        { host: undefined, allow: true, protocol: 'https:' },
        { host: undefined, allow: true, protocol: 'ws:' },
        { host: undefined, allow: true, protocol: 'wss:' },
        { host: undefined, allow: true, protocol: 'data:' },
        { host: undefined, allow: false, protocol: undefined }, // Default action is to deny!
      ],
    }),
  }),
  zoom: schema.number({ defaultValue: 2 }),
  viewport: schema.object({
    width: schema.number({ defaultValue: 1950 }),
    height: schema.number({ defaultValue: 1200 }),
  }),
  loadDelay: schema.oneOf([schema.number(), schema.duration()], {
    defaultValue: moment.duration({ seconds: 3 }),
  }),
  browser: schema.object({
    autoDownload: schema.conditional(
      schema.contextRef('dist'),
      true,
      schema.boolean({ defaultValue: false }),
      schema.boolean({ defaultValue: true })
    ),
    chromium: schema.object({
      inspect: schema.conditional(
        schema.contextRef('dist'),
        true,
        schema.boolean({ defaultValue: false }),
        schema.maybe(schema.never())
      ),
      disableSandbox: schema.maybe(schema.boolean()), // default value is dynamic in createConfig$
      proxy: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
        server: schema.conditional(
          schema.siblingRef('enabled'),
          true,
          schema.uri({ scheme: ['http', 'https'] }),
          schema.maybe(schema.never())
        ),
        bypass: schema.conditional(
          schema.siblingRef('enabled'),
          true,
          schema.arrayOf(schema.string()),
          schema.maybe(schema.never())
        ),
      }),
    }),
    type: schema.string({ defaultValue: 'chromium' }),
  }),
  maxAttempts: schema.conditional(
    schema.contextRef('dist'),
    true,
    schema.number({ defaultValue: 3 }),
    schema.number({ defaultValue: 1 })
  ),
});

const CsvSchema = schema.object({
  checkForFormulas: schema.boolean({ defaultValue: true }),
  escapeFormulaValues: schema.boolean({ defaultValue: false }),
  enablePanelActionDownload: schema.boolean({ defaultValue: true }),
  maxSizeBytes: schema.oneOf([schema.number(), schema.byteSize()], {
    defaultValue: ByteSizeValue.parse('10mb'),
  }),
  useByteOrderMarkEncoding: schema.boolean({ defaultValue: false }),
  scroll: schema.object({
    duration: schema.string({
      defaultValue: '30s', // this value is passed directly to ES, so string only format is preferred
      validate(value) {
        if (!/^[0-9]+(d|h|m|s|ms|micros|nanos)$/.test(value)) {
          return 'must be a duration string';
        }
      },
    }),
    size: schema.number({ defaultValue: 500 }),
  }),
});

const EncryptionKeySchema = schema.conditional(
  schema.contextRef('dist'),
  true,
  schema.maybe(schema.string()), // default value is dynamic in createConfig$
  schema.string({ defaultValue: 'a'.repeat(32) })
);

const RolesSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }), // true: use ES API for access control (deprecated in 7.x). false: use Kibana API for application features (8.0)
  allow: schema.arrayOf(schema.string(), { defaultValue: ['reporting_user'] }),
});

// Browser side polling: job completion notifier, management table auto-refresh
// NOTE: can not use schema.duration, a bug prevents it being passed to the browser correctly
const PollSchema = schema.object({
  jobCompletionNotifier: schema.object({
    interval: schema.number({ defaultValue: 10000 }),
    intervalErrorMultiplier: schema.number({ defaultValue: 5 }), // unused
  }),
  jobsRefresh: schema.object({
    interval: schema.number({ defaultValue: 5000 }),
    intervalErrorMultiplier: schema.number({ defaultValue: 5 }), // unused
  }),
});

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  kibanaServer: KibanaServerSchema,
  queue: QueueSchema,
  capture: CaptureSchema,
  csv: CsvSchema,
  encryptionKey: EncryptionKeySchema,
  roles: RolesSchema,
  poll: PollSchema,
});

export type ReportingConfigType = TypeOf<typeof ConfigSchema>;
