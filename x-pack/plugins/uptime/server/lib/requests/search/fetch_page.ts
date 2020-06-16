/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CursorPagination } from './types';
import { QueryContext } from './query_context';
import { QUERY } from '../../../../common/constants';
import { CursorDirection, MonitorSummary, SortOrder, Ping } from '../../../../common/runtime_types';
import { MonitorSummaryIterator } from './monitor_summary_iterator';

/**
 *
 * Gets a single page of results per the settings in the provided queryContext. These results are very minimal,
 * just monitor IDs and check groups. This takes an optional `MonitorGroupEnricher` that post-processes the minimal
 * data, decorating it appropriately. The function also takes a fetcher, which does all the actual fetching.
 * @param queryContext defines the criteria for the data on the current page
 * @param monitorSummariesFetcher performs paginated monitor fetching
 * @param monitorEnricher decorates check group results with additional data
 */
// just monitor IDs and check groups. This takes an optional `MonitorGroupEnricher` that post-processes the minimal
// data, decorating it appropriately. The function also takes a fetcher, which does all the actual fetching.
export const fetchPage = async (
  queryContext: QueryContext,
  monitorSummariesFetcher: MonitorSummariesFetcher = fetchPageMonitorSummaries,
): Promise<MonitorSummariesPage> => {
  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);
  const page = monitorSummariesFetcher(queryContext, size);
  return page;
};

// Fetches the most recent monitor groups for the given page,
// in the manner demanded by the `queryContext` and return at most `size` results.
const fetchPageMonitorSummaries: MonitorSummariesFetcher = async (
  queryContext: QueryContext,
  size: number
): Promise<MonitorSummariesPage> => {
  const monitorSummaries: MonitorSummary[] = [];

  const iterator = new MonitorSummaryIterator(queryContext);

  let paginationBefore: CursorPagination | null = null;
  while (monitorSummaries.length < size) {
    const monitor = await iterator.next();
    if (!monitor) {
      break; // No more items to fetch
    }
    monitorSummaries.push(monitor);

    // We want the before pagination to be before the first item we encounter
    if (monitorSummaries.length === 1) {
      paginationBefore = await iterator.paginationBeforeCurrent();
    }
  }

  // We have to create these objects before checking if we can navigate backward
  const paginationAfter = await iterator.paginationAfterCurrent();

  const ssAligned = searchSortAligned(queryContext.pagination);

  if (!ssAligned) {
    monitorSummaries.reverse();
  }

  return {
    monitorSummaries: monitorSummaries,
    nextPagePagination: ssAligned ? paginationAfter : paginationBefore,
    prevPagePagination: ssAligned ? paginationBefore : paginationAfter,
  };
};

// Returns true if the order returned by the ES query matches the requested sort order.
// This useful to determine if the results need to be reversed from their ES results order.
// I.E. when navigating backwards using prevPagePagination (CursorDirection.Before) yet using a SortOrder.ASC.
const searchSortAligned = (pagination: CursorPagination): boolean => {
  if (pagination.cursorDirection === CursorDirection.AFTER) {
    return pagination.sortOrder === SortOrder.ASC;
  } else {
    return pagination.sortOrder === SortOrder.DESC;
  }
};

// Minimal interface representing the most recent set of groups accompanying a MonitorId in a given context.
export interface MonitorGroups {
  id: string;
  groups: MonitorLocCheckGroup[];
}

// Representation of the data returned when aggregating summary check groups.
export interface MonitorLocCheckGroup {
  monitorId: string;
  location: string | null;
  checkGroup: string;
  summaryPings: {[key: string]: Ping};
  status: 'up' | 'down';
  summaryTimestamp: Date;
}

// Represents a page that has not yet been enriched.
export interface MonitorSummariesPage {
  monitorSummaries: MonitorSummary[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

// A function that does the work of matching the minimal set of data for this query, returning just matching fields
// that are efficient to access while performing the query.
export type MonitorSummariesFetcher = (
  queryContext: QueryContext,
  size: number
) => Promise<MonitorSummariesPage>;