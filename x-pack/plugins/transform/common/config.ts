/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const configSchema = schema.object({
  experimental: schema.maybe(
    schema.object({
      ruleFormV2Enabled: schema.maybe(schema.boolean()),
    })
  ),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = ConfigSchema['experimental'];
