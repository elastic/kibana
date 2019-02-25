/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StringMap } from 'x-pack/plugins/apm/typings/common';

declare module 'elasticsearch' {
  // extending SearchResponse to be able to have typed aggregations
  export interface AggregationSearchResponse<T, U = void>
    extends SearchResponse<T> {
    aggregations: U;
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
