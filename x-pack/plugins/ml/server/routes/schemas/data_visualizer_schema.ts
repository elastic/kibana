/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const indexPatternTitleSchema = schema.object({
  indexPatternTitle: schema.string(),
});

export const dataVisualizerFieldStatsSchema = schema.object({
  query: schema.any(),
  fields: schema.arrayOf(schema.any()),
  samplerShardSize: schema.number(),
  timeFieldName: schema.maybe(schema.string()),
  earliest: schema.maybe(schema.number()),
  latest: schema.maybe(schema.number()),
  interval: schema.maybe(schema.string()),
  maxExamples: schema.number(),
});

export const dataVisualizerOverallStatsSchema = schema.object({
  query: schema.any(),
  aggregatableFields: schema.arrayOf(schema.string()),
  nonAggregatableFields: schema.arrayOf(schema.string()),
  samplerShardSize: schema.number(),
  timeFieldName: schema.maybe(schema.string()),
  earliest: schema.maybe(schema.number()),
  latest: schema.maybe(schema.number()),
});
