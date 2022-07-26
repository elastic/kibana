/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { Inspect, Maybe, SortField } from '../../common';
import type { RequestOptionsPaginated } from '../..';

export type ResultEdges = estypes.SearchResponse<unknown>['hits']['hits'];

export interface ResultsStrategyResponse extends IEsSearchResponse {
  edges: ResultEdges;
  inspect?: Maybe<Inspect>;
}

export interface ResultsRequestOptions extends Omit<RequestOptionsPaginated, 'sort'> {
  actionId: string;
  agentId?: string;
  sort: SortField[];
}
