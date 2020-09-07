/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { TRANSFORM_STATE } from '../constants';

export const transformIdsSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
  })
);

export type TransformIdsSchema = TypeOf<typeof transformIdsSchema>;

export const transformStateSchema = schema.oneOf([
  schema.literal(TRANSFORM_STATE.ABORTING),
  schema.literal(TRANSFORM_STATE.FAILED),
  schema.literal(TRANSFORM_STATE.INDEXING),
  schema.literal(TRANSFORM_STATE.STARTED),
  schema.literal(TRANSFORM_STATE.STOPPED),
  schema.literal(TRANSFORM_STATE.STOPPING),
]);

export const indexPatternTitleSchema = schema.object({
  /** Title of the index pattern for which to return stats. */
  indexPatternTitle: schema.string(),
});

export type IndexPatternTitleSchema = TypeOf<typeof indexPatternTitleSchema>;

export const transformIdParamSchema = schema.object({
  transformId: schema.string(),
});

export type TransformIdParamSchema = TypeOf<typeof transformIdParamSchema>;

export interface ResponseStatus {
  success: boolean;
  error?: any;
}

export interface CommonResponseStatusSchema {
  [key: string]: ResponseStatus;
}
