/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from 'elasticsearch';
import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, PageInfoPaginated } from '../../common';
import { RequestOptionsPaginated } from '../..';

export type ResultEdges = SearchResponse<unknown>['hits']['hits'];

export interface ResultsStrategyResponse extends IEsSearchResponse {
  edges: ResultEdges;
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface ResultsRequestOptions extends RequestOptionsPaginated<{}> {
  actionId: string;
  agentId?: string;
}
