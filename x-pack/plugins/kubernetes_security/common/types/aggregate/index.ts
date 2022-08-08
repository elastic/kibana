/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Aggregate {
  key: string | number;
  doc_count: number;
}

interface Bucket extends Aggregate {
  key_as_string?: string;
  count_by_aggs?: {
    value: number;
  };
}

export interface AggregateResult {
  buckets: Bucket[];
  hasNextPage: boolean;
}

export interface AggregateBucketPaginationResult {
  buckets: Bucket[];
  hasNextPage: boolean;
}
