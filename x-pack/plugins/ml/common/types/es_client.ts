/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse, ShardsResponse } from 'elasticsearch';

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7Hits<T> {
  hits: SearchResponse<T>['hits']['hits'];
  max_score: number;
  total: {
    value: number;
    relation: string;
  };
}
export interface SearchResponse7<T = any> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: SearchResponse7Hits<T>;
  aggregations?: any;
}
