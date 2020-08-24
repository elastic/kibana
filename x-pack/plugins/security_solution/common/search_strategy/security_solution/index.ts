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
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
} from './hosts';
import {
  AuthenticationsQuery,
  AuthenticationsRequestOptions,
  AuthenticationsStrategyResponse,
} from './authentications';
export * from './hosts';
export type Maybe<T> = T | null;

export type FactoryQueryTypes = HostsQueries | AuthenticationsQuery;

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

export interface SortField {
  field: string;
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

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface TotalValue {
  value: number;
  relation: string;
}
export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

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

export interface RequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  factoryQueryType?: FactoryQueryTypes;
}

export interface SourceConfiguration {
  /** The field mapping to use for this source */
  fields: SourceFields;
}

/** A mapping of semantic fields to their document counterparts */
export interface SourceFields {
  /** The field to identify a container by */
  container: string;
  /** The fields to identify a host by */
  host: string;
  /** The fields that may contain the log event message. The first field found win. */
  message: string[];
  /** The field to identify a pod by */
  pod: string;
  /** The field to use as a tiebreaker for log events that have identical timestamps */
  tiebreaker: string;
  /** The field to use as a timestamp for metrics and logs */
  timestamp: string;
}

export interface RequestOptions extends RequestBasicOptions {
  pagination: PaginationInput;
  sortField?: SortField;
}

export interface RequestOptionsPaginated extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  sortField?: SortField;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsStrategyResponse
  : T extends HostsQueries.hostOverview
  ? HostOverviewStrategyResponse
  : T extends AuthenticationsQuery.authentications
  ? AuthenticationsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends HostsQueries.hosts
  ? HostsRequestOptions
  : T extends HostsQueries.hostOverview
  ? HostOverviewRequestOptions
  : T extends AuthenticationsQuery.authentications
  ? AuthenticationsRequestOptions
  : never;
