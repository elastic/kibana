/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const alertingFrameworkHealthSchema = schema.object({
  status: schema.oneOf([schema.literal('ok'), schema.literal('warn'), schema.literal('error')]),
  timestamp: schema.string(),
});

export const healthFrameworkResponseBodySchema = schema.object({
  is_sufficiently_secure: schema.boolean(),
  has_permanent_encryption_key: schema.boolean(),
  alerting_framework_health: schema.object({
    decryption_health: alertingFrameworkHealthSchema,
    execution_health: alertingFrameworkHealthSchema,
    read_health: alertingFrameworkHealthSchema,
  }),
});

export const healthFrameworkResponseSchema = schema.object({
  body: healthFrameworkResponseBodySchema,
});
