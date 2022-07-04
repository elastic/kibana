/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// export interface AggregateResult {
//   key: string | number;
//   key_as_string?: string;
//   doc_count: number;
//   count_by_aggs: {
//     value: number;
//   };
// }

interface Aggregate {
  key: string | number;
  doc_count: number;
}

interface Buckets extends Aggregate {
  key_as_string?: string;
  count_by_aggs: {
    value: number;
  };
}
export interface AggregateResult {
  buckets: Buckets[];
  hasNextPage: boolean;
}

export interface AggregateBucketPaginationResult {
  buckets: Aggregate[];
  hasNextPage: boolean;
}
