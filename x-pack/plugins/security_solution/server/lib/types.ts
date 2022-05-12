/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ConfigType as Configuration } from '../config';
import { TotalValue, BaseHit, Explanation } from '../../common/detection_engine/types';

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  failures?: ShardError[];
}

/**
 * This type is being very conservative with the partials to not expect anything to
 * be guaranteed on the type as we don't have regular and proper types of ShardError.
 * Once we do, remove this type for the regular ShardError type from the elastic library.
 */
export type ShardError = Partial<{
  shard: number;
  index: string;
  node: string;
  reason: Partial<{
    type: string;
    reason: string;
    index_uuid: string;
    index: string;
    caused_by: Partial<{
      type: string;
      reason: string;
    }>;
  }>;
}>;

export interface SearchHits<T> {
  total: TotalValue | number;
  max_score: number;
  hits: Array<
    BaseHit<T> & {
      _type?: string;
      _score?: number;
      _version?: number;
      _explanation?: Explanation;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }
  >;
}

export interface BaseSearchResponse<T> {
  hits: SearchHits<T>;
}

export interface SearchResponse<T> extends BaseSearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface TermAggregationBucket {
  key: string;
  doc_count: number;
  min_timestamp: {
    value_as_string: string;
  };
  max_timestamp: {
    value_as_string: string;
  };
  cardinality_count?: {
    value: number;
  };
}
