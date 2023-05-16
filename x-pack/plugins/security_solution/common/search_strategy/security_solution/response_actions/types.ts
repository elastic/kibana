/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { LogsEndpointAction } from '../../../endpoint/types';
import type { LogsOsqueryAction } from './actions';
import type { ResponseActionsQueries } from '.';

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface SortField<Field = string> {
  field: Field;
  direction: Direction;
}

export interface RequestBasicOptions extends IEsSearchRequest {
  factoryQueryType?: ResponseActionsQueries;
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
}

export type ResultEdges = estypes.SearchResponse<
  LogsOsqueryAction | LogsEndpointAction
>['hits']['hits'];

export type ResponseActionsSearchHit = estypes.SearchHit<LogsOsqueryAction | LogsEndpointAction>;

export interface Inspect {
  dsl: string[];
}

export type Maybe<T> = T | null;
