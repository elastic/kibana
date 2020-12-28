/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  search: schema.object({
    sendToBackground: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      sessionsManagement: schema.object({
        maxSessions: schema.number({ defaultValue: 10000 }),
        refreshInterval: schema.duration({ defaultValue: '3s' }),
        refreshTimeout: schema.duration({ defaultValue: '1m' }),
        expiresSoonWarning: schema.duration({ defaultValue: '1d' }),
      }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
