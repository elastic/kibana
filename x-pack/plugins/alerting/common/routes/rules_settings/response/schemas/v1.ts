/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const queryDelaySettingsResponseBodySchema = schema.object({
  delay: schema.number(),
  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
});

export const queryDelaySettingsResponseSchema = schema.object({
  body: queryDelaySettingsResponseBodySchema,
});
