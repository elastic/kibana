/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from './query_context';
import { MonitorSummaryState, MonitorSummary } from '../../../../common/runtime_types';

/**
 * Determines whether the provided check groups are the latest complete check groups for their associated monitor ID's.
 * If provided check groups are not the latest complete group, they are discarded.
 * @param queryContext the data and resources needed to perform the query
 * @param potentialMatchMonitorIDs the monitor ID's of interest
 * @param potentialMatchCheckGroups the check groups to filter for the latest match per ID
 */
// check groups for their associated monitor IDs. If not, it discards the result.
export const refinePotentialMatches = async (
  queryContext: QueryContext,
  potentialMatchMonitorIDs: string[]
): Promise<MonitorSummary[]> => {
  if (potentialMatchMonitorIDs.length === 0) {
    return [];
  }

  const queryResult = await query(queryContext, potentialMatchMonitorIDs);
  return await fullyMatchingIds(queryResult, queryContext.statusFilter);
};

export const fullyMatchingIds = (queryResult: any, statusFilter?: string): MonitorSummary[] => {
  const summaries: MonitorSummary[] = [];

  MonitorLoop: for (const monBucket of queryResult.aggregations.monitor.buckets) {
    const monitorId: string = monBucket.key;

    // Did at least one location match?
    let matched = false;
    const monitorSummaryState: MonitorSummaryState = {
      timestamp: "",
      checks: [],
      observer: {geo: {name: []}},
      summary: {
        up: 0,
        down: 0,
      },
      url: {}
    };

    for (const locBucket of monBucket.location.buckets) {
      const location = locBucket.key;
      const latestSource = locBucket.summaries.latest.hits.hits[0]._source;
      const latestStillMatchingSource = locBucket.latest_matching.top.hits.hits[0]?._source;
      // If the most recent document still matches the most recent document matching the current filters
      // we can include this in the result
      //
      // We just check if the timestamp is greater. Note this may match an incomplete check group
      // that has not yet sent a summary doc
      if (
        latestStillMatchingSource &&
        latestStillMatchingSource['@timestamp'] >= latestSource['@timestamp']
      ) {
        matched = true;
      }
      const status = latestSource.summary.down > 0 ? 'down' : 'up';

      // This monitor doesn't match, so just skip ahead and don't add it to the output
      // Only skip in case of up statusFilter, for a monitor to be up, all checks should be up
      if (statusFilter === 'up' && statusFilter !== status) {
        continue MonitorLoop;
      }

      monitorSummaryState.url = latestSource.url;
      monitorSummaryState.observer?.geo?.name?.push(location)
      if (monitorSummaryState.summary) { // unnecessary if, for type checker
        monitorSummaryState.summary.up += latestSource.summary.up;
        monitorSummaryState.summary.down += latestSource.summary.down;
      }
    }
    if (matched) {
      summaries.push({
        monitor_id: monitorId,
        state: monitorSummaryState
      });
    }
  }

  return summaries;
};

export const query = async (
  queryContext: QueryContext,
  potentialMatchMonitorIDs: string[]
): Promise<any> => {
  const params = {
    index: queryContext.heartbeatIndices,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            await queryContext.dateRangeFilter(),
            { terms: { 'monitor.id': potentialMatchMonitorIDs } },
          ],
        },
      },
      aggs: {
        monitor: {
          terms: { field: 'monitor.id', size: potentialMatchMonitorIDs.length },
          aggs: {
            location: {
              terms: { field: 'observer.geo.name', missing: 'N/A', size: 100 },
              aggs: {
                summaries: {
                  // only match summary docs because we only want the latest *complete* check group.
                  filter: { exists: { field: 'summary' } },
                  aggs: {
                    latest: {
                      top_hits: {
                        sort: [{ '@timestamp': 'desc' }],
                        size: 1,
                      },
                    },
                  },
                },
                // We want to find the latest check group, even if it's not part of a summary
                latest_matching: {
                  filter: queryContext.filterClause || { match_all: {} },
                  aggs: {
                    top: {
                      top_hits: {
                        sort: [{ '@timestamp': 'desc' }],
                        size: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return await queryContext.search(params);
};
