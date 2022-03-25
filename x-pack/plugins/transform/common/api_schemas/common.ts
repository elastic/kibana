/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { TRANSFORM_STATE } from '../constants';

export const transformIdsSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
  })
);

export type TransformIdsSchema = TypeOf<typeof transformIdsSchema>;

// reflects https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/transforms/TransformStats.java#L250
export const transformStateSchema = schema.oneOf([
  schema.literal(TRANSFORM_STATE.ABORTING),
  schema.literal(TRANSFORM_STATE.FAILED),
  schema.literal(TRANSFORM_STATE.INDEXING),
  schema.literal(TRANSFORM_STATE.STARTED),
  schema.literal(TRANSFORM_STATE.STOPPED),
  schema.literal(TRANSFORM_STATE.STOPPING),
  schema.literal(TRANSFORM_STATE.WAITING),
]);

export const dataViewTitleSchema = schema.object({
  /** Title of the data view for which to return stats. */
  dataViewTitle: schema.string(),
});

export type DataViewTitleSchema = TypeOf<typeof dataViewTitleSchema>;

export const transformIdParamSchema = schema.object({
  transformId: schema.string(),
});

export type TransformIdParamSchema = TypeOf<typeof transformIdParamSchema>;

export interface ResponseStatus {
  success: boolean;
  // FIXME error response should have unified shape
  error?: {
    type: string;
    reason: string;
    root_cause: any[];
    caused_by: any;
  } & { response: any };
}

export interface CommonResponseStatusSchema {
  [key: string]: ResponseStatus;
}

export const runtimeMappingsSchema = schema.maybe(
  schema.recordOf(
    schema.string(),
    schema.object({
      type: schema.oneOf([
        schema.literal('keyword'),
        schema.literal('long'),
        schema.literal('double'),
        schema.literal('date'),
        schema.literal('ip'),
        schema.literal('boolean'),
        schema.literal('geo_point'),
        schema.literal('composite'),
      ]),
      script: schema.maybe(
        schema.oneOf([
          schema.string(),
          schema.object({
            source: schema.string(),
          }),
        ])
      ),
    })
  )
);
