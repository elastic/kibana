/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const indexPatternTitleSchema = schema.object({
  /** Title of the index pattern for which to return stats. */
  indexPatternTitle: schema.string(),
});

export const dataVisualizerFieldHistogramsSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  /** The fields to return histogram data. */
  fields: schema.arrayOf(schema.any()),
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
});

export const dataVisualizerFieldStatsSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  fields: schema.arrayOf(schema.any()),
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
  /** Name of the time field in the index (optional). */
  timeFieldName: schema.maybe(schema.string()),
  /** Earliest timestamp for search, as epoch ms (optional). */
  earliest: schema.maybe(schema.number()),
  /** Latest timestamp for search, as epoch ms (optional). */
  latest: schema.maybe(schema.number()),
  /** Aggregation interval to use for obtaining document counts over time (optional). */
  interval: schema.maybe(schema.string()),
  /** Maximum number of examples to return for text type fields.  */
  maxExamples: schema.number(),
});

export const dataVisualizerOverallStatsSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  /** Names of aggregatable fields for which to return stats. */
  aggregatableFields: schema.arrayOf(schema.string()),
  /** Names of non-aggregatable fields for which to return stats. */
  nonAggregatableFields: schema.arrayOf(schema.string()),
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
  /** Name of the time field in the index (optional). */
  timeFieldName: schema.maybe(schema.string()),
  /** Earliest timestamp for search, as epoch ms (optional). */
  earliest: schema.maybe(schema.number()),
  /** Latest timestamp for search, as epoch ms (optional). */
  latest: schema.maybe(schema.number()),
});
