/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import { AgentsStrategyResponse, AgentsRequestOptions } from './agents';

import { DocValueFields, SortField, PaginationInput, PaginationInputPaginated } from '../common';

export * from './agents';

export enum OsqueryQueries {
  agents = 'agents',
}

export type FactoryQueryTypes = OsqueryQueries;

export interface RequestBasicOptions extends IEsSearchRequest {
  filterQuery: ESQuery | string | undefined;
  docValueFields?: DocValueFields[];
  factoryQueryType?: FactoryQueryTypes;
}

/** A mapping of semantic fields to their document counterparts */

export interface RequestOptions<Field = string> extends RequestBasicOptions {
  pagination: PaginationInput;
  sort: SortField<Field>;
}

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  sort: SortField<Field>;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends OsqueryQueries.agents
  ? AgentsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends OsqueryQueries.agents
  ? AgentsRequestOptions
  : never;
