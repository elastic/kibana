/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CONTEXT_DEFAULTS } from '../../../common/constants';
import { fetchPage } from './search';
import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorSummary, SortOrder, CursorDirection } from '../../../common/runtime_types';
import { QueryContext } from './search';

export interface CursorPagination {
  cursorKey?: any;
  cursorDirection: CursorDirection;
  sortOrder: SortOrder;
}

export interface GetMonitorStatesParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination?: CursorPagination;
  pageSize: number;
  filters?: string | null;
  statusFilter?: string;
}

export interface GetMonitorStatesResult {
  summaries: MonitorSummary[];
  nextPagePagination: string | null;
  prevPagePagination: string | null;
}

// To simplify the handling of the group of pagination vars they're passed back to the client as a string
const jsonifyPagination = (p: any): string | null => {
  if (!p) {
    return null;
  }

  return JSON.stringify(p);
};

// Gets a page of monitor states.
export const getMonitorStates: UMElasticsearchQueryFn<
  GetMonitorStatesParams,
  GetMonitorStatesResult
> = async ({
  callES,
  dynamicSettings,
  dateRangeStart,
  dateRangeEnd,
  pagination,
  pageSize,
  filters,
  statusFilter,
}) => {
  pagination = pagination || CONTEXT_DEFAULTS.CURSOR_PAGINATION;
  statusFilter = statusFilter === null ? undefined : statusFilter;

  const queryContext = new QueryContext(
    callES,
    dynamicSettings.heartbeatIndices,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    filters && filters !== '' ? JSON.parse(filters) : null,
    pageSize,
    statusFilter
  );

  const page = await fetchPage(queryContext);

  return {
    summaries: page.items,
    nextPagePagination: jsonifyPagination(page.nextPagePagination),
    prevPagePagination: jsonifyPagination(page.prevPagePagination),
  };
};
