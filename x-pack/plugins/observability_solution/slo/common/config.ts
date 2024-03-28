/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  sloOrphanSummaryCleanUpTaskEnabled: schema.boolean({ defaultValue: true }),
  enabled: schema.boolean({ defaultValue: true }),
  experimental: schema.maybe(
    schema.object({
      ruleFormV2: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    })
  ),
});

export const config = {
  schema: configSchema,
  exposeToBrowser: {
    experimental: true,
  },
};
export type SloConfig = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = SloConfig['experimental'];
