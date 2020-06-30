/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { TypeOf } from '@kbn/config-schema';
import { IIndexPattern, TimeRange, Filter, Query } from 'src/plugins/data/public';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { alertingIndexGetQuerySchema } from './schema/alert_index';
import { indexPatternGetParamsSchema } from './schema/index_pattern';
import {
  HostMetadata,
  AlertEvent,
  KbnConfigSchemaInputTypeOf,
  AppLocation,
} from '../endpoint/types';

/**
 * Values for the Alert APIs 'order' and 'direction' parameters.
 */
export type AlertAPIOrdering = 'asc' | 'desc';

/**
 * Returned by 'api/endpoint/alerts'
 */
export interface AlertResultList {
  /**
   * The alerts restricted by page size.
   */
  alerts: AlertData[];

  /**
   * The total number of alerts on the page.
   */
  total: number;

  /**
   * The size of the requested page.
   */
  request_page_size: number;

  /**
   * The index of the requested page, starting at 0.
   */
  request_page_index?: number;

  /**
   * The offset of the requested page, starting at 0.
   */
  result_from_index?: number;

  /**
   * A cursor-based URL for the next page.
   */
  next: string | null;

  /**
   * A cursor-based URL for the previous page.
   */
  prev: string | null;
}

interface AlertMetadata {
  id: string;

  // Alert Details Pagination
  next: string | null;
  prev: string | null;
}

interface AlertState {
  state: {
    host_metadata: HostMetadata;
  };
}

export type AlertData = AlertEvent & AlertMetadata;

export type AlertDetails = AlertData & AlertState;

/**
 * Represents `total` response from Elasticsearch after ES 7.0.
 */
export interface ESTotal {
  value: number;
  relation: string;
}

/**
 * `Hits` array in responses from ES search API.
 */
export type AlertHits = SearchResponse<AlertEvent>['hits']['hits'];

/**
 * Query params to pass to the alert API when fetching new data.
 */
export type AlertingIndexGetQueryInput = KbnConfigSchemaInputTypeOf<
  TypeOf<typeof alertingIndexGetQuerySchema>
>;

/**
 * Result of the validated query params when handling alert index requests.
 */
export type AlertingIndexGetQueryResult = TypeOf<typeof alertingIndexGetQuerySchema>;

/**
 * Result of the validated params when handling an index pattern request.
 */
export type IndexPatternGetParamsResult = TypeOf<typeof indexPatternGetParamsSchema>;

interface AlertsSearchBarState {
  patterns: IIndexPattern[];
}

export type AlertListData = AlertResultList;

export interface AlertListState {
  /** Array of alert items. */
  readonly alerts: AlertData[];

  /** The total number of alerts on the page. */
  readonly total: number;

  /** Number of alerts per page. */
  readonly pageSize: number;

  /** Page number, starting at 0. */
  readonly pageIndex: number;

  /** Current location object from React Router history. */
  readonly location?: AppLocation;

  /** Specific Alert data to be shown in the details view */
  readonly alertDetails?: AlertDetails;

  /** Search bar state including indexPatterns */
  readonly searchBar: AlertsSearchBarState;
}

/**
 * Gotten by parsing the URL from the browser. Used to calculate the new URL when changing views.
 */
export interface AlertingIndexUIQueryParams {
  /**
   * How many items to show in list.
   */
  page_size?: string;
  /**
   * Which page to show. If `page_index` is 1, show page 2.
   */
  page_index?: string;
  /**
   * If any value is present, show the alert detail view for the selected alert. Should be an ID for an alert event.
   */
  selected_alert?: string;
  /**
   * Retain the selected tab through any refreshes. Should be an ID for an alert event.
   */
  active_details_tab?: string;
  query?: string;
  date_range?: string;
  filters?: string;
}

/**
 * Sort parameters for alerts in ES.
 */
export interface AlertSortParam {
  [key: string]: {
    order: AlertAPIOrdering;
    missing?: UndefinedResultPosition;
  };
}

/**
 * Sort array for alerts.
 */
export type AlertSort = [AlertSortParam, AlertSortParam];

/**
 * Cursor-based pagination params.
 */
export type SearchCursor = [string, string];

/**
 * Request metadata used in searching alerts.
 */
export interface AlertSearchQuery {
  pageSize: number;
  pageIndex?: number;
  fromIndex?: number;
  query: Query;
  filters: Filter[];
  dateRange?: TimeRange;
  sort: string;
  order: AlertAPIOrdering;
  searchAfter?: SearchCursor;
  searchBefore?: SearchCursor;
  emptyStringIsUndefined?: boolean;
}

/**
 * ES request body for alerts.
 */
export interface AlertSearchRequest {
  track_total_hits: number;
  query: JsonObject;
  sort: AlertSort;
  search_after?: SearchCursor;
}

/**
 * Request for alerts.
 */
export interface AlertSearchRequestWrapper {
  index: string;
  size: number;
  from?: number;
  body: AlertSearchRequest;
}

/**
 * Request params for alert details.
 */
export interface AlertDetailsRequestParams {
  id: string;
}

/**
 * Request params for alert queries.
 *
 * Must match exactly the values that the API receives.
 */
export interface AlertListRequestQuery {
  page_index?: number;
  page_size: number;
  query?: string;
  filters?: string;
  date_range: string;
  sort: string;
  order: AlertAPIOrdering;
  after?: SearchCursor;
  before?: SearchCursor;
  empty_string_is_undefined?: boolean;
}

/**
 * Indicates whether undefined results are sorted to the beginning (_first) or end (_last)
 * of a result set.
 */
export enum UndefinedResultPosition {
  first = '_first',
  last = '_last',
}
