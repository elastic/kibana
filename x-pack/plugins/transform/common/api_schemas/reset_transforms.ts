/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { transformStateSchema, ResponseStatus } from './common';

export const resetTransformsRequestSchema = schema.object({
  /**
   * Reset Transforms
   */
  transformsInfo: schema.arrayOf(
    schema.object({
      id: schema.string(),
      state: transformStateSchema,
    })
  ),
});

export type ResetTransformsRequestSchema = TypeOf<typeof resetTransformsRequestSchema>;

export interface ResetTransformStatus {
  transformReset: ResponseStatus;
}

export interface ResetTransformsResponseSchema {
  [key: string]: ResetTransformStatus;
}
