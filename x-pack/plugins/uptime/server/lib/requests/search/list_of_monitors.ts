/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChunkResult } from './monitor_summary_iterator';
import { QueryContext } from './query_context';
import { MonitorSummary } from '../../../../common/runtime_types/monitor';
import { Ping } from '../../../../common/runtime_types/ping';
import { summaryPingsToSummary } from './refine_potential_matches';
import { createEsQuery } from '../../lib';

export const getQueryFilter = (query?: string) => {
  return query
    ? {
        minimum_should_match: 1,
        should: [
          {
            multi_match: {
              query: escape(query),
              type: 'phrase_prefix' as const,
              fields: ['monitor.id.text', 'monitor.name.text', 'url.full.text'],
            },
          },
        ],
      }
    : {};
};

export const summaryByLocAggs = {
  terms: { field: 'observer.geo.name', missing: 'N/A', size: 100 },
  aggs: {
    summaries: {
      // only match summary docs because we only want the latest *complete* check group.
      filter: { exists: { field: 'summary' } },
      aggs: {
        latest: {
          top_hits: {
            sort: [{ '@timestamp': 'desc' as const }],
            size: 1,
          },
        },
      },
    },
  },
};

export const getListOfMonitors = async (queryContext: QueryContext): Promise<ChunkResult> => {
  const cursorKey = queryContext.pagination?.cursorKey;

  const params = createEsQuery({
    body: {
      size: 0,
      query: {
        bool: {
          ...getQueryFilter(queryContext.query),
          filter: [
            {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: queryContext.dateRangeStart,
                        lte: queryContext.dateRangeEnd,
                      },
                    },
                  },
                  {
                    exists: {
                      field: 'summary',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      aggs: {
        monitors: {
          composite: {
            ...(cursorKey ? { after: cursorKey } : {}),

            size: queryContext.size,
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                    order: queryContext.cursorOrder(),
                  },
                },
              },
            ],
          },
          aggs: {
            location: summaryByLocAggs,
          },
        },
      },
    },
  });

  const { body: data } = await queryContext.search(params);

  const summaries: MonitorSummary[] = [];

  for (const monBucket of data.aggregations?.monitors.buckets ?? []) {
    const summaryPings: Ping[] = [];

    for (const locBucket of monBucket.location.buckets) {
      const latest = locBucket.summaries.latest.hits.hits[0];
      // It is possible for no latest summary to exist in this bucket if only partial
      // non-summary docs exist
      if (!latest) {
        continue;
      }

      summaryPings.push({
        ...(latest._source as Ping),
        docId: latest._id,
        timestamp: (latest._source as Ping & { '@timestamp': string })['@timestamp'],
      });
    }

    summaries.push(summaryPingsToSummary(summaryPings));
  }

  return {
    monitorSummaries: summaries,
    searchAfter: data.aggregations?.monitors?.after_key,
  };
};
