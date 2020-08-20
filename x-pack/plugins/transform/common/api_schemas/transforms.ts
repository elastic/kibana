/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { TRANSFORM_STATE } from '../constants';

import { ResponseStatus } from './common';

export const transformsRequestSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
    state: schema.maybe(
      schema.oneOf([
        schema.literal(TRANSFORM_STATE.ABORTING),
        schema.literal(TRANSFORM_STATE.FAILED),
        schema.literal(TRANSFORM_STATE.INDEXING),
        schema.literal(TRANSFORM_STATE.STARTED),
        schema.literal(TRANSFORM_STATE.STOPPED),
        schema.literal(TRANSFORM_STATE.STOPPING),
      ])
    ),
  })
);

export type TransformsRequestSchema = TypeOf<typeof transformsRequestSchema>;

export interface TransformResponseSchema {
  [key: string]: ResponseStatus;
}
