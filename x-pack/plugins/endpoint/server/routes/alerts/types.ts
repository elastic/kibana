/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Filter, TimeRange } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/public';
import { Direction } from '../../../common/types';

/**
 * Represents the side of the result set where entries with undefined sort values will appear.
 */
export enum UndefinedResultPosition {
  first = '_first',
  last = '_last',
}

/**
 * Sort parameters for alerts in ES.
 */
export interface AlertSortParam {
  [key: string]: {
    order: Direction;
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
 * Parsed request parameters for searching, sorting, and paginating alerts
 */
export interface AlertSearchParams {
  // Filtering
  query?: string;
  filters: Filter[];
  dateRange: TimeRange;

  // Sorting
  sort: string;
  order: Direction;

  pageSize?: number; // TODO: this should not be optional

  // Simple pagination
  pageIndex?: number;
  fromIndex?: number;

  // Cursor-based pagination
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
 * Common query params for alerts.
 */
export interface AlertRequestQuery {
  query?: string;
  filters?: string;
  date_range: string;
  sort: string;
  order: Direction;
}

/**
 * Request params for paginating alerts.
 */
export interface AlertListRequestQueryPagination {
  page_size?: number; // TODO: this shouldn't be optional?
  page_index?: number;
  after?: SearchCursor;
  before?: SearchCursor;
  empty_string_is_undefined?: boolean;
}

/**
 * Full set of query params for the Alert List API.
 */
export type AlertListRequestQuery = AlertRequestQuery & AlertListRequestQueryPagination;
