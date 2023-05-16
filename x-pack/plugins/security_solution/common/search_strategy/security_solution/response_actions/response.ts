/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { LogsEndpointActionResponse } from '../../../endpoint/types';
import type { Direction, Inspect, Maybe, RequestBasicOptions } from './types';

export type ResultEdges = estypes.SearchResponse<unknown>['hits']['hits'];

export interface ActionResponsesRequestOptions extends RequestBasicOptions {
  expiration: string;
  actionId: string;
  sort: {
    direction: Direction;
    field: string;
  };
}

export interface ActionResponsesRequestStrategyResponse
  extends IKibanaSearchResponse<
    estypes.SearchResponse<
      LogsEndpointActionResponse,
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
  edges: ResultEdges;
  inspect?: Maybe<Inspect>;
}
