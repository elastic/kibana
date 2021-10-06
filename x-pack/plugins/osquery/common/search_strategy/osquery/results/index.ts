/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import { Inspect, Maybe, PageInfoPaginated, SortField } from '../../common';
import { RequestOptionsPaginated } from '../..';

export type ResultEdges = estypes.SearchResponse<unknown>['hits']['hits'];

export interface ResultsStrategyResponse extends IEsSearchResponse {
  edges: ResultEdges;
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface ResultsRequestOptions extends Omit<RequestOptionsPaginated, 'sort'> {
  actionId: string;
  agentId?: string;
  sort: SortField[];
}
