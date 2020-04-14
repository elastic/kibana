/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Type } from '../common/schemas/common/schemas';

// TODO: Use Definitely typed instead of all of this stuff:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/elasticsearch/index.d.ts

/* BEGIN TODO Use Definitely typed instead of all of this stuff: */
export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface TotalValue {
  value: number;
  relation: string;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export interface CreateResponse {
  _index: string;
  _id: string;
  _version: number;
  result: 'created' | 'updated';
  _shards: ShardsResponse;
  _seq_no: number;
  _primary_term: number;
}

export type UpdateResponse = CreateResponse;

/* END TODO Use Definitely typed instead of all of this stuff: */

export interface BaseElasticListType {
  name: string;
  description: string;
  type: Type;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
  created_at: string;
  updated_at: string;

  // TODO: Figure out how to implement these below
  // created_by: string;
  // modified_by: string;
}

export type ElasticListReturnType = BaseElasticListType;
export type ElasticListInputType = BaseElasticListType;

export interface BaseElasticListItemType {
  list_id: string;
  created_at: string;
  updated_at: string;
  tie_breaker_id: string;
  meta?: object; // TODO: Implement this in the code
}

export type ElasticListItemReturnType = BaseElasticListItemType & {
  ip: string | null | undefined;
  keyword: string | null | undefined;
};

export type ElasticListItemsType =
  | {
      ip: string;
    }
  | {
      keyword: string;
    };

export type ElasticListItemsInputType = BaseElasticListItemType & ElasticListItemsType;
