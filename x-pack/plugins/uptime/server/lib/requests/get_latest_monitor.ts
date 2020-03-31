/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../../../legacy/plugins/uptime/common/graphql/types';

export interface GetLatestMonitorParams {
  /** @member dateRangeStart timestamp bounds */
  dateStart: string;

  /** @member dateRangeEnd timestamp bounds */
  dateEnd: string;

  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
}

// Get The monitor latest state sorted by timestamp with date range
export const getLatestMonitor: UMElasticsearchQueryFn<GetLatestMonitorParams, Ping> = async ({
  callES,
  dynamicSettings,
  dateStart,
  dateEnd,
  monitorId,
}) => {
  // TODO: Write tests for this function

  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: dateStart,
                  lte: dateEnd,
                },
              },
            },
            ...(monitorId ? [{ term: { 'monitor.id': monitorId } }] : []),
          ],
        },
      },
      size: 0,
      aggs: {
        by_id: {
          terms: {
            field: 'monitor.id',
            size: 1000,
          },
          aggs: {
            latest: {
              top_hits: {
                size: 1,
                sort: {
                  '@timestamp': { order: 'desc' },
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await callES('search', params);
  const ping: any = result.aggregations?.by_id.buckets?.[0]?.latest.hits?.hits?.[0] ?? {};

  return {
    ...ping?._source,
    timestamp: ping?._source?.['@timestamp'],
  };
};
