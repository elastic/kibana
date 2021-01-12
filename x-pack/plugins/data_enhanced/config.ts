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
      trackingInterval: schema.number({ defaultValue: 10000 }),
      inMemTimeout: schema.number({ defaultValue: 60000 }),
      maxUpdateRetries: schema.number({ defaultValue: 3 }),
      defaultExpiration: schema.number({ defaultValue: 7 * 24 * 60 * 60 * 1000 }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
