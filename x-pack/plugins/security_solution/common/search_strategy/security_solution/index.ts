/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import {
  HostOverviewStrategyResponse,
  HostOverviewRequestOptions,
  HostFirstLastSeenStrategyResponse,
  HostFirstLastSeenRequestOptions,
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
} from './hosts';
import {
  AuthenticationsRequestOptions,
  AuthenticationsStrategyResponse,
} from './hosts/authentications';
import {
  NetworkQueries,
  NetworkTlsStrategyResponse,
  NetworkTlsRequestOptions,
  NetworkHttpStrategyResponse,
  NetworkHttpRequestOptions,
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
  ? AuthenticationsStrategyResponse
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenStrategyResponse
  : T extends NetworkQueries.tls
  ? NetworkTlsStrategyResponse
  : T extends NetworkQueries.http
  ? NetworkHttpStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.hostOverview
  ? HostOverviewRequestOptions
  : T extends HostsQueries.authentications
  ? AuthenticationsRequestOptions
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenRequestOptions
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptions
  : T extends NetworkQueries.http
  ? NetworkHttpRequestOptions
  : never;
