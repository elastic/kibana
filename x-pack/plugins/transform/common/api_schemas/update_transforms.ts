/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { TransformPivotConfig } from '../types/transform';

import { settingsSchema, sourceSchema, syncSchema } from './transforms';

// POST _transform/{transform_id}/_update
export const postTransformsUpdateRequestSchema = schema.object({
  description: schema.maybe(schema.string()),
  // we cannot reuse `destSchema` because `index` is optional for the update request
  dest: schema.maybe(
    schema.object({
      index: schema.string(),
      pipeline: schema.maybe(schema.string()),
    })
  ),
  frequency: schema.maybe(schema.string()),
  settings: schema.maybe(settingsSchema),
  source: schema.maybe(sourceSchema),
  sync: schema.maybe(syncSchema),
});

export type PostTransformsUpdateRequestSchema = TypeOf<typeof postTransformsUpdateRequestSchema>;
export type PostTransformsUpdateResponseSchema = TransformPivotConfig;
