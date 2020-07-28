/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../common/runtime_types';

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
      size: 1,
      _source: ['url', 'monitor', 'observer', '@timestamp', 'tls.*'],
      sort: {
        '@timestamp': { order: 'desc' },
      },
    },
  };

  const result = await callES('search', params);
  const doc = result.hits?.hits?.[0];
  const docId = doc?._id ?? '';
  const { tls, ...ping } = doc?._source ?? {};

  return {
    ...ping,
    docId,
    timestamp: ping['@timestamp'],
    tls,
  };
};
