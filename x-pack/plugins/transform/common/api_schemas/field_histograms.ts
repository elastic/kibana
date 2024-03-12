/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { ChartData } from '@kbn/ml-data-grid';

import { runtimeMappingsSchema } from './common';

export const fieldHistogramsRequestSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  /** The fields to return histogram data. */
  fields: schema.arrayOf(schema.any()),
  /** Optional runtime fields */
  runtimeMappings: runtimeMappingsSchema,
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
});

export type FieldHistogramsRequestSchema = TypeOf<typeof fieldHistogramsRequestSchema>;
export type FieldHistogramsResponseSchema = ChartData[];
