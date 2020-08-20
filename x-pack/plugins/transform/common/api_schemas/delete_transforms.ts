/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { transformStateSchema, ResponseStatus } from './common';

export const deleteTransformsRequestSchema = schema.object({
  /**
   * Delete Transform & Destination Index
   */
  transformsInfo: schema.arrayOf(
    schema.object({
      id: schema.string(),
      state: transformStateSchema,
    })
  ),
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestIndexPattern: schema.maybe(schema.boolean()),
  forceDelete: schema.maybe(schema.boolean()),
});

export type DeleteTransformsRequestSchema = TypeOf<typeof deleteTransformsRequestSchema>;

export interface DeleteTransformStatus {
  transformDeleted: ResponseStatus;
  destIndexDeleted?: ResponseStatus;
  destIndexPatternDeleted?: ResponseStatus;
  destinationIndex?: string | undefined;
}

export interface DeleteTransformsResponseSchema {
  [key: string]: DeleteTransformStatus;
}
