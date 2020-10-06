/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertAction } from '../../../alerts/common';

export type RuleAlertAction = Omit<AlertAction, 'actionTypeId'> & {
  action_type_id: string;
};

export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[]
  | undefined;

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface TotalValue {
  value: number;
  relation: string;
}

export interface BaseHit<T> {
  _index: string;
  _id: string;
  _source: T;
}

export interface EqlSequence<T> {
  join_keys: SearchTypes[];
  events: Array<BaseHit<T>>;
}

export interface EqlSearchResponse<T> {
  is_partial: boolean;
  is_running: boolean;
  took: number;
  timed_out: boolean;
  hits: {
    total: TotalValue;
    sequences?: Array<EqlSequence<T>>;
    events?: Array<BaseHit<T>>;
  };
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  failures?: ShardError[];
}

export interface ShardError {
  shard: number;
  index: string;
  node: string;
  reason: {
    type: string;
    reason: string;
    index_uuid: string;
    index: string;
    caused_by: {
      type: string;
      reason: string;
    };
  };
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
    max_score: number;
    hits: Array<
      BaseHit<T> & {
        _type: string;
        _score: number;
        _version?: number;
        _explanation?: Explanation;
        fields?: string[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        highlight?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inner_hits?: any;
        matched_queries?: string[];
        sort?: string[];
      }
    >;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];
