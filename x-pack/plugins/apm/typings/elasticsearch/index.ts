/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { AggregationResponseMap, AggregationInputMap } from './aggregations';

export interface ESSearchBody {
  query?: any;
  size?: number;
  aggs?: AggregationInputMap;
  track_total_hits?: boolean | number;
}

export type ESSearchRequest = Omit<SearchParams, 'body'> & {
  body?: ESSearchBody;
};

export interface ESSearchOptions {
  restTotalHitsAsInt: boolean;
}

export type ESSearchHit<T> = SearchResponse<T>['hits']['hits'][0];

export type ESSearchResponse<
  TDocument,
  TSearchRequest extends ESSearchRequest,
  TOptions extends ESSearchOptions = { restTotalHitsAsInt: false }
> = Omit<SearchResponse<TDocument>, 'aggregations' | 'hits'> &
  (TSearchRequest extends { body: { aggs: AggregationInputMap } }
    ? {
        aggregations?: AggregationResponseMap<
          TSearchRequest['body']['aggs'],
          TDocument
        >;
      }
    : {}) & {
    hits: Omit<SearchResponse<TDocument>['hits'], 'total'> &
      (TOptions['restTotalHitsAsInt'] extends true
        ? {
            total: number;
          }
        : {
            total: {
              value: number;
              relation: 'eq' | 'gte';
            };
          });
  };

export interface ESFilter {
  [key: string]: {
    [key: string]:
      | string
      | string[]
      | number
      | boolean
      | Record<string, unknown>
      | ESFilter[];
  };
}
