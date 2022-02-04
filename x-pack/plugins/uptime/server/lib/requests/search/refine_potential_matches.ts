/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContext } from './query_context';
import { MonitorSummary, Ping } from '../../../../common/runtime_types';

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

  const { body: queryResult } = await query(queryContext, potentialMatchMonitorIDs);
  return await fullyMatchingIds(queryResult, queryContext.statusFilter);
};

export const fullyMatchingIds = (queryResult: any, statusFilter?: string): MonitorSummary[] => {
  const summaries: MonitorSummary[] = [];

  for (const monBucket of queryResult.aggregations.monitor.buckets) {
    // Did at least one location match?
    let matched = false;

    const summaryPings: Ping[] = [];

    for (const locBucket of monBucket.location.buckets) {
      const latest = locBucket.summaries.latest.hits.hits[0];
      // It is possible for no latest summary to exist in this bucket if only partial
      // non-summary docs exist
      if (!latest) {
        continue;
      }

      const latestStillMatching = locBucket.latest_matching.top.hits.hits[0];
      // If the most recent document still matches the most recent document matching the current filters
      // we can include this in the result
      //
      // We just check if the timestamp is greater. Note this may match an incomplete check group
      // that has not yet sent a summary doc
      if (
        latestStillMatching &&
        latestStillMatching._source['@timestamp'] >= latest._source['@timestamp']
      ) {
        matched = true;
      }

      summaryPings.push({
        docId: latest._id,
        timestamp: latest._source['@timestamp'],
        ...latest._source,
      });
    }

    const someDown = summaryPings.some((p) => (p.summary?.down ?? 0) > 0);
    const statusFilterOk = !statusFilter ? true : statusFilter === 'up' ? !someDown : someDown;

    if (matched && statusFilterOk) {
      summaries.push(summaryPingsToSummary(summaryPings));
    }
  }

  return summaries;
};

export const summaryPingsToSummary = (summaryPings: Ping[]): MonitorSummary => {
  summaryPings.sort((a, b) =>
    a.timestamp > b.timestamp ? 1 : a.timestamp === b.timestamp ? 0 : -1
  );
  const latest = summaryPings[summaryPings.length - 1];
  return {
    monitor_id: latest.monitor.id,
    configId: latest.config_id,
    state: {
      timestamp: latest.timestamp,
      monitor: {
        name: latest.monitor?.name,
        type: latest.monitor?.type,
        duration: latest.monitor?.duration,
      },
      url: latest.url ?? {},
      summary: {
        up: summaryPings.reduce((acc, p) => (p.summary?.up ?? 0) + acc, 0),
        down: summaryPings.reduce((acc, p) => (p.summary?.down ?? 0) + acc, 0),
        status: summaryPings.some((p) => (p.summary?.down ?? 0) > 0) ? 'down' : 'up',
      },
      summaryPings,
      tls: latest.tls,
      // easier to ensure to use '' for an empty geo name in terms of types
      observer: {
        geo: { name: summaryPings.map((p) => p.observer?.geo?.name ?? '').filter((n) => n !== '') },
      },
      service: summaryPings.find((p) => p.service?.name)?.service,
    },
  };
};

export const query = async (
  queryContext: QueryContext,
  potentialMatchMonitorIDs: string[]
): Promise<any> => {
  const params = {
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
          terms: {
            field: 'monitor.id',
            size: potentialMatchMonitorIDs.length,
            order: { _key: queryContext.cursorOrder() },
          },
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
                        _source: ['@timestamp'],
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

  return await queryContext.search(params, 'getMonitorList-refinePotentialMatches');
};
