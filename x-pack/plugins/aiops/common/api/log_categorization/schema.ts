/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { isRuntimeField } from '@kbn/ml-runtime-field-utils';

export const runtimeMappingsSchema = schema.object(
  {},
  {
    unknowns: 'allow',
    validate: (v: object) => {
      if (Object.values(v).some((o) => !isRuntimeField(o))) {
        return i18n.translate('xpack.aiops.invalidRuntimeFieldMessage', {
          defaultMessage: 'Invalid runtime field',
        });
      }
    },
  }
);

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
export type CategorizationFieldValidationSchema = TypeOf<
  typeof categorizationFieldValidationSchema
>;
