/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const fieldHistogramsSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  /** The fields to return histogram data. */
  fields: schema.arrayOf(schema.any()),
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
});

export const indexPatternTitleSchema = schema.object({
  /** Title of the index pattern for which to return stats. */
  indexPatternTitle: schema.string(),
});

export interface IndexPatternTitleSchema {
  indexPatternTitle: string;
}

export const schemaTransformId = {
  params: schema.object({
    transformId: schema.string(),
  }),
};

export interface SchemaTransformId {
  transformId: string;
}

export const deleteTransformSchema = schema.object({
  /**
   * Delete Transform & Destination Index
   */
  transformsInfo: schema.arrayOf(
    schema.object({
      id: schema.string(),
      state: schema.maybe(schema.string()),
    })
  ),
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestIndexPattern: schema.maybe(schema.boolean()),
  forceDelete: schema.maybe(schema.boolean()),
});
