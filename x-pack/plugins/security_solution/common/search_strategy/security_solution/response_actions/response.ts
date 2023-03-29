/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Direction, Inspect, Maybe, RequestBasicOptions } from './types';

export type ResultEdges<T> = estypes.SearchResponse<T>['hits']['hits'];

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
}

export interface ActionResponsesRequestOptions extends RequestOptionsPaginated {
  expiration: string;
  actionId: string;
  sort: {
    direction: Direction;
    field: string;
  };
}

export interface ActionResponsesRequestStrategyResponse<T>
  extends IKibanaSearchResponse<
    estypes.SearchResponse<
      T,
      {
        aggs: {
          responses_by_action_id: estypes.AggregationsSingleBucketAggregateBase & {
            rows_count: estypes.AggregationsSumAggregate;
            responses: {
              buckets: Array<{
                key: string;
                doc_count: number;
              }>;
            };
          };
        };
      }
    >
  > {
  edges: ResultEdges<T>;
  inspect?: Maybe<Inspect>;
}
