/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse, IKibanaSearchResponse } from '@kbn/data-plugin/common';

import type { Inspect, Maybe } from '../../common';
import type { RequestOptions, RequestOptionsPaginated } from '../..';

export type ActionEdges = estypes.SearchResponse<object>['hits']['hits'];

export type ActionResultEdges = estypes.SearchResponse<object>['hits']['hits'];
export interface ActionsStrategyResponse extends IEsSearchResponse {
  edges: ActionEdges;
  inspect?: Maybe<Inspect>;
}

export interface ActionDetails {
  action_id: string;
  expiration: string;
  '@timestamp': string;
  agent_all: boolean;
  agent_ids: string[];
  agent_platforoms: string[];
  agent_policy_ids: string[];
  agents: string[];
  user_id?: string;
  pack_id?: string;
  pack_name?: string;
  pack_prebuilt?: boolean;
  status?: string;
  queries?: Array<{
    action_id: string;
    id: string;
    query: string;
    agents: string[];
    ecs_mapping?: unknown;
    version?: string;
    platform?: string;
    saved_query_id?: string;
    expiration?: string;
  }>;
}

export type ActionsRequestOptions = RequestOptionsPaginated;

export interface ActionDetailsStrategyResponse extends IEsSearchResponse {
  actionDetails: estypes.SearchHit<ActionDetails>;
  inspect?: Maybe<Inspect>;
}

export interface ActionDetailsRequestOptions extends RequestOptions {
  actionId: string;
}

export interface ActionResultsStrategyResponse
  extends IKibanaSearchResponse<
    estypes.SearchResponse<
      object,
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
  edges: ActionResultEdges;
  inspect?: Maybe<Inspect>;
}

export interface ActionResultsRequestOptions extends RequestOptionsPaginated {
  actionId: string;
  startDate?: string;
}
