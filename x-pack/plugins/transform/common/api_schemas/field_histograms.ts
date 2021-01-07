/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const fieldHistogramsRequestSchema = schema.object({
  /** Query to match documents in the index. */
  query: schema.any(),
  /** The fields to return histogram data. */
  fields: schema.arrayOf(schema.any()),
  /** Number of documents to be collected in the sample processed on each shard, or -1 for no sampling. */
  samplerShardSize: schema.number(),
});

export type FieldHistogramsRequestSchema = TypeOf<typeof fieldHistogramsRequestSchema>;
export type FieldHistogramsResponseSchema = any[];
