/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CursorPagination } from './types';
import { QueryContext } from './query_context';
import { QUERY } from '../../../../common/constants';
import { MonitorSummary } from '../../../../common/runtime_types';
import { MonitorSummaryIterator } from './monitor_summary_iterator';
import { getHistogramForMonitors as getHistogramsForMonitors } from './get_monitor_histograms';

/**
 *
 * Gets a single page of results per the settings in the provided queryContext.
 */
export const fetchPage = async (queryContext: QueryContext): Promise<MonitorSummariesPage> => {
  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);

  const iterator = new MonitorSummaryIterator(queryContext);
  const page = await iterator.nextPage(size);

  const histograms = await getHistogramsForMonitors(
    queryContext,
    page.monitorSummaries.map((s) => s.monitor_id)
  );

  page.monitorSummaries.forEach((s) => {
    s.histogram = histograms[s.monitor_id];
  });

  return page;
};

// Represents a page of summaries + pagination
export interface MonitorSummariesPage {
  monitorSummaries: MonitorSummary[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}
