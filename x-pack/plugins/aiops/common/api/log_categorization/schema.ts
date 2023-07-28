/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { runtimeMappingsSchema } from '@kbn/ml-runtime-field-utils';

export const indicesOptionsSchema = schema.object({
  expand_wildcards: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('all'),
        schema.literal('open'),
        schema.literal('closed'),
        schema.literal('hidden'),
        schema.literal('none'),
      ])
    )
  ),
  ignore_unavailable: schema.maybe(schema.boolean()),
  allow_no_indices: schema.maybe(schema.boolean()),
  ignore_throttled: schema.maybe(schema.boolean()),
});

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

export const categorizationFieldValidationSchema = schema.object({
  indexPatternTitle: schema.string(),
  query: schema.any(),
  size: schema.number(),
  field: schema.string(),
  timeField: schema.maybe(schema.string()),
  start: schema.number(),
  end: schema.number(),
  analyzer: schema.maybe(schema.any()),
  runtimeMappings: runtimeMappingsSchema,
  indicesOptions: indicesOptionsSchema,
  includeExamples: schema.boolean(),
});
