/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

export interface TermsAggsBucket {
  key: string;
  doc_count: number;
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type TopHits<T> = Omit<
  SearchResponse<T>,
  'took' | 'timed_out' | '_shards'
>;

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations
  export interface AggregationSearchResponse<T, U = void>
    extends SearchResponse<T> {
    aggregations: U;
  }
}
