/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { transformStateSchema, CommonResponseStatusSchema } from './common';

export const stopTransformsRequestSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
    state: transformStateSchema,
  })
);

export type StopTransformsRequestSchema = TypeOf<typeof stopTransformsRequestSchema>;
export type StopTransformsResponseSchema = CommonResponseStatusSchema;
