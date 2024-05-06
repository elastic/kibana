/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

const enabledSchema = schema.maybe(
  schema.object({
    enabled: schema.boolean(),
  })
);

const compatibleModuleTypeSchema = schema.maybe(
  schema.oneOf([
    schema.literal('observability'),
    schema.literal('security'),
    schema.literal('search'),
  ])
);

export const configSchema = schema.object({
  ad: enabledSchema,
  dfa: enabledSchema,
  nlp: enabledSchema,
  compatibleModuleType: compatibleModuleTypeSchema,
  experimental: schema.maybe(
    schema.object({
      ruleFormV2: enabledSchema,
    })
  ),
});
