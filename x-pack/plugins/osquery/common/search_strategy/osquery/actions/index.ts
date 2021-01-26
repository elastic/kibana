/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, PageInfoPaginated } from '../../common';
import { RequestOptions, RequestOptionsPaginated } from '../..';

export type ActionEdge = SearchResponse<object>['hits']['hits'];

export type ActionResultEdge = SearchResponse<object>['hits']['hits'];
export interface ActionsStrategyResponse extends IEsSearchResponse {
  edges: ActionEdge;
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export type ActionsRequestOptions = RequestOptionsPaginated<{}>;

export interface ActionDetailsStrategyResponse extends IEsSearchResponse {
  actionDetails: Record<string, any>;
  inspect?: Maybe<Inspect>;
}

export interface ActionDetailsRequestOptions extends RequestOptions {
  actionId: string;
}

export interface ActionResultsStrategyResponse extends IEsSearchResponse {
  edges: ActionResultEdge;
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface ActionResultsRequestOptions extends RequestOptionsPaginated {
  actionId: string;
}
