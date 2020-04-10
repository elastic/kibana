/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMElasticsearchQueryFn } from '../adapters';
import { PingType, Ping } from '../../../../../legacy/plugins/uptime/common/runtime_types';

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
      _source: ['url', 'monitor', 'observer', 'tls', '@timestamp'],
      sort: {
        '@timestamp': { order: 'desc' },
      },
    },
  };

  const result = await callES('search', params);
  const source = result.hits?.hits?.[0]?._source ?? {};

  const decoded = PingType.decode({ ...source, timestamp: source['@timestamp'] });
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error(JSON.stringify(PathReporter.report(decoded)));
};
