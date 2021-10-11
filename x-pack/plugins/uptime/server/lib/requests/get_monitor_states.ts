/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_DEFAULTS, QUERY } from '../../../common/constants';
import { UMElasticsearchQueryFn } from '../adapters';
import { SortOrder, CursorDirection, MonitorSummariesResult } from '../../../common/runtime_types';
import { QueryContext, MonitorSummaryIterator } from './search';

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
  query?: string;
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
  MonitorSummariesResult
> = async ({
  uptimeEsClient,
  dateRangeStart,
  dateRangeEnd,
  pagination,
  pageSize,
  filters,
  statusFilter,
  query,
}) => {
  pagination = pagination || CONTEXT_DEFAULTS.CURSOR_PAGINATION;
  statusFilter = statusFilter === null ? undefined : statusFilter;

  const queryContext = new QueryContext(
    uptimeEsClient,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    filters && filters !== '' ? JSON.parse(filters) : null,
    pageSize,
    statusFilter,
    query
  );

  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);

  const iterator = new MonitorSummaryIterator(queryContext);
  const page = await iterator.nextPage(size);

  return {
    summaries: page.monitorSummaries,
    nextPagePagination: jsonifyPagination(page.nextPagePagination),
    prevPagePagination: jsonifyPagination(page.prevPagePagination),
  };
};
