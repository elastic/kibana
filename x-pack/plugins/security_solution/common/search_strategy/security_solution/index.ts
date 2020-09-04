/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import {
  HostOverviewStrategyResponse,
  HostAuthenticationsRequestOptions,
  HostAuthenticationsStrategyResponse,
  HostOverviewRequestOptions,
  HostFirstLastSeenStrategyResponse,
  HostFirstLastSeenRequestOptions,
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
  HostUncommonProcessesStrategyResponse,
  HostUncommonProcessesRequestOptions,
} from './hosts';
import {
  NetworkQueries,
  NetworkTlsStrategyResponse,
  NetworkTlsRequestOptions,
  NetworkHttpStrategyResponse,
  NetworkHttpRequestOptions,
  NetworkTopCountriesStrategyResponse,
  NetworkTopCountriesRequestOptions,
  NetworkTopNFlowStrategyResponse,
  NetworkTopNFlowRequestOptions,
} from './network';
import {
  DocValueFields,
  TimerangeInput,
  SortField,
  PaginationInput,
  PaginationInputPaginated,
} from '../common';

export * from './hosts';
export * from './network';

export type FactoryQueryTypes = HostsQueries | NetworkQueries;

export interface RequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
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

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsStrategyResponse
  : T extends HostsQueries.hostOverview
  ? HostOverviewStrategyResponse
  : T extends HostsQueries.authentications
  ? HostAuthenticationsStrategyResponse
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenStrategyResponse
  : T extends HostsQueries.uncommonProcesses
  ? HostUncommonProcessesStrategyResponse
  : T extends NetworkQueries.tls
  ? NetworkTlsStrategyResponse
  : T extends NetworkQueries.http
  ? NetworkHttpStrategyResponse
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesStrategyResponse
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.hostOverview
  ? HostOverviewRequestOptions
  : T extends HostsQueries.authentications
  ? HostAuthenticationsRequestOptions
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenRequestOptions
  : T extends HostsQueries.uncommonProcesses
  ? HostUncommonProcessesRequestOptions
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptions
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptions
  : T extends NetworkQueries.topCountries
  ? NetworkTopCountriesRequestOptions
  : T extends NetworkQueries.topNFlow
  ? NetworkTopNFlowRequestOptions
  : never;
