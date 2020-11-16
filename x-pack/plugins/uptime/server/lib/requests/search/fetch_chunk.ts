/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { refinePotentialMatches } from './refine_potential_matches';
import { findPotentialMatches } from './find_potential_matches';
import { QueryContext } from './query_context';
import { getHistogramInterval } from '../../helper/get_histogram_interval';
import { getHistogramForMonitors } from '../get_monitor_states';
import { MonitorSummary } from '../../../../common/runtime_types/monitor';

/**
 * Fetches a single 'chunk' of data with a single query, then uses a secondary query to filter out erroneous matches.
 * Note that all returned data may be erroneous. If `searchAfter` is returned the caller should invoke this function
 * repeatedly with the new searchAfter value as there may be more matching data in a future chunk. If `searchAfter`
 * is falsey there is no more data to fetch.
 * @param queryContext the data and resources needed to perform the query
 *  * @param size the minimum size of the matches to chunk
 * @param index where to start for query

 */
export const fetchChunk = async (queryContext: QueryContext, size: number, index: number) => {
  const { monitorIds, totalMonitors } = await findPotentialMatches(queryContext, size, index);

  const minInterval = getHistogramInterval(
    queryContext.dateRangeStart,
    queryContext.dateRangeEnd,
    // 12 seems to be a good size for performance given
    // long monitor lists of up to 100 on the overview page
    12
  );

  const [matching, histograms] = await Promise.all([
    refinePotentialMatches(queryContext, monitorIds),
    getHistogramForMonitors(queryContext, monitorIds, minInterval),
  ]);

  const monitorSummaries: MonitorSummary[] = monitorIds
    .map((monId) => matching.find((summary) => summary.monitor_id === monId)!)
    .filter((summary) => summary);

  return {
    totalMonitors,
    monitorSummaries: monitorSummaries.map((s) => ({
      ...s,
      minInterval,
      histogram: histograms[s.monitor_id],
    })),
  };
};
