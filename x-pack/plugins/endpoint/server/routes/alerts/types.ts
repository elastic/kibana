/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Query, Filter, TimeRange } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/public';
import { Direction } from '../../../common/types';

/**
 * Sort parameters for alerts in ES.
 */
export interface AlertSortParam {
  [key: string]: {
    order: Direction;
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
  order: Direction;
  searchAfter?: SearchCursor;
  searchBefore?: SearchCursor;
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
  order: Direction;
  after?: SearchCursor;
  before?: SearchCursor;
}
