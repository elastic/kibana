/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter } from './adapter_types';
import { INDEX_NAMES, CONTEXT_DEFAULTS } from '../../../../common';
import { fetchPage } from './search';
import { QueryContext } from './search/query_context';
import { MonitorGroupIterator } from './search/monitor_group_iterator';
import { getSnapshotCountHelper } from './get_snapshot_helper';

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

    const queryContext = new QueryContext(
      callES,
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filters && filters !== '' ? JSON.parse(filters) : null,
      size,
      statusFilter
    );

    const page = await fetchPage(queryContext);

    return {
      summaries: page.items,
      nextPagePagination: jsonifyPagination(page.nextPagePagination),
      prevPagePagination: jsonifyPagination(page.prevPagePagination),
    };
  },

  getSnapshotCount: async ({ callES, dateRangeStart, dateRangeEnd, filters, statusFilter }) => {
    const context = new QueryContext(
      callES,
      dateRangeStart,
      dateRangeEnd,
      CONTEXT_DEFAULTS.CURSOR_PAGINATION,
      filters && filters !== '' ? JSON.parse(filters) : null,
      CONTEXT_DEFAULTS.MAX_MONITORS_FOR_SNAPSHOT_COUNT,
      statusFilter
    );

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
