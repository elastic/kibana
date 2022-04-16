/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IEsSearchRequest } from '@kbn/data-plugin/common';
import { ESQuery } from '../../typed_json';
import {
  ActionsStrategyResponse,
  ActionsRequestOptions,
  ActionDetailsStrategyResponse,
  ActionDetailsRequestOptions,
  ActionResultsStrategyResponse,
  ActionResultsRequestOptions,
} from './actions';
import { AgentsStrategyResponse, AgentsRequestOptions } from './agents';
import { ResultsStrategyResponse, ResultsRequestOptions } from './results';

import { DocValueFields, SortField, PaginationInputPaginated } from '../common';

export * from './actions';
export * from './agents';
export * from './results';

export enum OsqueryQueries {
  actions = 'actions',
  actionDetails = 'actionDetails',
  actionResults = 'actionResults',
  agents = 'agents',
  results = 'results',
}

export type FactoryQueryTypes = OsqueryQueries;

export interface RequestBasicOptions extends IEsSearchRequest {
  filterQuery: ESQuery | string | undefined;
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  docValueFields?: DocValueFields[];
  factoryQueryType?: FactoryQueryTypes;
}

/** A mapping of semantic fields to their document counterparts */

export type RequestOptions = RequestBasicOptions;

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  sort: SortField<Field>;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends OsqueryQueries.actions
  ? ActionsStrategyResponse
  : T extends OsqueryQueries.actionDetails
  ? ActionDetailsStrategyResponse
  : T extends OsqueryQueries.actionResults
  ? ActionResultsStrategyResponse
  : T extends OsqueryQueries.agents
  ? AgentsStrategyResponse
  : T extends OsqueryQueries.results
  ? ResultsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends OsqueryQueries.actions
  ? ActionsRequestOptions
  : T extends OsqueryQueries.actionDetails
  ? ActionDetailsRequestOptions
  : T extends OsqueryQueries.actionResults
  ? ActionResultsRequestOptions
  : T extends OsqueryQueries.agents
  ? AgentsRequestOptions
  : T extends OsqueryQueries.results
  ? ResultsRequestOptions
  : never;
