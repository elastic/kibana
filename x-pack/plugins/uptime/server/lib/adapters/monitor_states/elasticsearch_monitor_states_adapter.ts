/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter, CursorPagination } from './adapter_types';
import {
  INDEX_NAMES,
  CONTEXT_DEFAULTS,
} from '../../../../../../legacy/plugins/uptime/common/constants';
import { fetchPage } from './search';
import { MonitorGroupIterator } from './search/monitor_group_iterator';
import { getSnapshotCountHelper } from './get_snapshot_helper';

export interface QueryContext {
  count: (query: Record<string, any>) => Promise<any>;
  search: (query: Record<string, any>) => Promise<any>;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination: CursorPagination;
  filterClause: any | null;
  size: number;
  statusFilter?: string;
}

export const elasticsearchMonitorStatesAdapter: UMMonitorStatesAdapter = {
  // Gets a page of monitor states.
  getMonitorStates: async ({
    callES,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    filters,
    statusFilter,
  }) => {
    pagination = pagination || CONTEXT_DEFAULTS.CURSOR_PAGINATION;
    statusFilter = statusFilter === null ? undefined : statusFilter;
    const size = 10;

    const queryContext: QueryContext = {
      count: (query: Record<string, any>): Promise<any> => callES('count', query),
      search: (query: Record<string, any>): Promise<any> => callES('search', query),
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filterClause: filters && filters !== '' ? JSON.parse(filters) : null,
      size,
      statusFilter,
    };

    const page = await fetchPage(queryContext);

    return {
      summaries: page.items,
      nextPagePagination: jsonifyPagination(page.nextPagePagination),
      prevPagePagination: jsonifyPagination(page.prevPagePagination),
    };
  },

  getSnapshotCount: async ({ callES, dateRangeStart, dateRangeEnd, filters, statusFilter }) => {
    const context: QueryContext = {
      count: query => callES('count', query),
      search: query => callES('search', query),
      dateRangeStart,
      dateRangeEnd,
      pagination: CONTEXT_DEFAULTS.CURSOR_PAGINATION,
      filterClause: filters && filters !== '' ? JSON.parse(filters) : null,
      size: CONTEXT_DEFAULTS.MAX_MONITORS_FOR_SNAPSHOT_COUNT,
      statusFilter,
    };
    return getSnapshotCountHelper(new MonitorGroupIterator(context));
  },

  statesIndexExists: async ({ callES }) => {
    // TODO: adapt this to the states index in future release
    const {
      _shards: { total },
      count,
    } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });
    return {
      indexExists: total > 0,
      docCount: {
        count,
      },
    };
  },
};

// To simplify the handling of the group of pagination vars they're passed back to the client as a string
const jsonifyPagination = (p: any): string | null => {
  if (!p) {
    return null;
  }

  return JSON.stringify(p);
};
