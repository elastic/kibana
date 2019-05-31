/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap } from './common';

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations
  export interface AggregationSearchResponse<Hits = unknown, Aggs = unknown>
    extends SearchResponse<Hits> {
    aggregations: Aggs;
  }

  export interface BucketAgg<T = string> {
    key: T;
    doc_count: number;
  }

  export interface TermsAggsBucket {
    key: string;
    doc_count: number;
  }

  export interface ESFilter {
    [key: string]: {
      [key: string]: string | number | StringMap | ESFilter[];
    };
  }
}
