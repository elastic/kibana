/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const aiopsExplainLogRateSpikesSchema = schema.object({
  start: schema.number(),
  end: schema.number(),
  searchQuery: schema.string(),
  timeFieldName: schema.string(),
  includeFrozen: schema.maybe(schema.boolean()),
  grouping: schema.maybe(schema.boolean()),
  /** Analysis selection time ranges */
  baselineMin: schema.number(),
  baselineMax: schema.number(),
  deviationMin: schema.number(),
  deviationMax: schema.number(),
  /** The index to query for log rate spikes */
  index: schema.string(),
  /** Settings to override headers derived compression and flush fix */
  compressResponse: schema.maybe(schema.boolean()),
  flushFix: schema.maybe(schema.boolean()),
});

export type AiopsExplainLogRateSpikesSchema = TypeOf<typeof aiopsExplainLogRateSpikesSchema>;
