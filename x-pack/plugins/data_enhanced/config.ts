/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  search: schema.object({
    sessions: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      pageSize: schema.number({ defaultValue: 10000 }),
      trackingInterval: schema.duration({ defaultValue: '10s' }),
      inMemTimeout: schema.duration({ defaultValue: '1m' }),
      maxUpdateRetries: schema.number({ defaultValue: 3 }),
      defaultExpiration: schema.duration({ defaultValue: '7d' }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
