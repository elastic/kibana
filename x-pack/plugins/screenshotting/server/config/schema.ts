/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import moment from 'moment';

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

export const ConfigSchema = schema.object({
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
  }),
  capture: schema.object({
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
    zoom: schema.number({ defaultValue: 2 }),
    loadDelay: schema.oneOf([schema.number(), schema.duration()], {
      defaultValue: moment.duration({ seconds: 3 }),
    }),
  }),
  poolSize: schema.number({ defaultValue: 1, min: 1 }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
