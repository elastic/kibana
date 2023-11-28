/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type {
  ActionsStrategyResponse,
  ActionsRequestOptions,
  ActionDetailsStrategyResponse,
  ActionDetailsRequestOptions,
  ActionResultsStrategyResponse,
  ActionResultsRequestOptions,
} from './actions';
import type { ResultsStrategyResponse, ResultsRequestOptions } from './results';

import type { SortField, PaginationInputPaginated } from '../common';

export * from './actions';
export * from './results';

export enum OsqueryQueries {
  actions = 'actions',
  actionDetails = 'actionDetails',
  actionResults = 'actionResults',
  results = 'results',
}

export type FactoryQueryTypes = OsqueryQueries;

export interface RequestBasicOptions extends IEsSearchRequest {
  kuery?: string;
  factoryQueryType?: FactoryQueryTypes;
  componentTemplateExists?: boolean;
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
  : T extends OsqueryQueries.results
  ? ResultsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends OsqueryQueries.actions
  ? ActionsRequestOptions
  : T extends OsqueryQueries.actionDetails
  ? ActionDetailsRequestOptions
  : T extends OsqueryQueries.actionResults
  ? ActionResultsRequestOptions
  : T extends OsqueryQueries.results
  ? ResultsRequestOptions
  : never;
