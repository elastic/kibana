/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const getCardinalityOfFieldsSchema = schema.object({
  /** Index or indexes for which to return the time range. */
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  /** Name(s) of the field(s) to return cardinality information. */
  fieldNames: schema.maybe(schema.arrayOf(schema.string())),
  /** Query to match documents in the index(es) (optional). */
  query: schema.maybe(schema.any()),
  /** Name of the time field in the index. */
  timeFieldName: schema.maybe(schema.string()),
  /** Earliest timestamp for search, as epoch ms (optional). */
  earliestMs: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  /** Latest timestamp for search, as epoch ms (optional). */
  latestMs: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
});

export const getTimeFieldRangeSchema = schema.object({
  /** Index or indexes for which to return the time range. */
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  /** Name of the time field in the index. */
  timeFieldName: schema.maybe(schema.string()),
  /** Query to match documents in the index(es). */
  query: schema.maybe(schema.any()),
});
