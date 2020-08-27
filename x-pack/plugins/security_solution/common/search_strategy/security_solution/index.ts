/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest, IEsSearchResponse } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import { HostsQueries } from './hosts';
import { HostsRequestOptions, HostsStrategyResponse } from './hosts/all';
import {
  HostFirstLastSeenRequestOptions,
  HostFirstLastSeenStrategyResponse,
} from './hosts/first_last_seen';
import { HostOverviewRequestOptions, HostOverviewStrategyResponse } from './hosts/overview';

import {
  UncommonProcessesStrategyResponse,
  UncommonProcessesRequestOptions,
} from './hosts/uncommon_processes';
import { NetworkQueries, NetworkTlsRequestOptions, NetworkTlsStrategyResponse } from './network';
export * from './hosts';
export * from './network';
export type Maybe<T> = T | null;

export type FactoryQueryTypes = HostsQueries | NetworkQueries;

export type SearchHit = IEsSearchResponse<object>['rawResponse']['hits']['hits'][0];

export interface TotalValue {
  value: number;
  relation: string;
}

export interface Inspect {
  dsl: string[];
  response: string[];
}

export interface PageInfoPaginated {
  activePage: number;
  fakeTotalCount: number;
  showMorePagesIndicator: boolean;
}

export interface CursorType {
  value?: Maybe<string>;
  tiebreaker?: Maybe<string>;
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface SortField<Field = string> {
  field: Field;
  direction: Direction;
}

export interface TimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: string;
  /** The beginning of the timerange */
  from: string;
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<string>;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<string>;
}

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export interface DocValueFields {
  field: string;
  format: string;
}

export interface RequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  factoryQueryType?: FactoryQueryTypes;
}

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
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenStrategyResponse
  : T extends HostsQueries.uncommonProcesses
  ? UncommonProcessesStrategyResponse
  : T extends NetworkQueries.tls
  ? NetworkTlsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.hostOverview
  ? HostOverviewRequestOptions
  : T extends HostsQueries.firstLastSeen
  ? HostFirstLastSeenRequestOptions
  : T extends HostsQueries.uncommonProcesses
  ? UncommonProcessesRequestOptions
  : T extends NetworkQueries.tls
  ? NetworkTlsRequestOptions
  : never;

export type StringOrNumber = string | number;

export interface TotalHit {
  value: number;
  relation: string;
}

export interface Hit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
}

export interface Hits<T, U> {
  hits: {
    total: T;
    max_score: number | null;
    hits: U[];
  };
}
