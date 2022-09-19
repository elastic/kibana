/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const categorizeSchema = schema.object({
  index: schema.string(),
  field: schema.string(),
  timeField: schema.string(),
  to: schema.number(),
  from: schema.number(),
  query: schema.any(),
  intervalMs: schema.maybe(schema.number()),
});

export type CategorizeSchema = TypeOf<typeof categorizeSchema>;
