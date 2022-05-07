/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../common/runtime_types';

export interface GetLatestMonitorParams {
  /** @member dateRangeStart timestamp bounds */
  dateStart: string;

  /** @member dateRangeEnd timestamp bounds */
  dateEnd: string;

  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;

  observerLocation?: string;
}

// Get The monitor latest state sorted by timestamp with date range
export const getLatestMonitor: UMElasticsearchQueryFn<GetLatestMonitorParams, Ping> = async ({
  uptimeEsClient,
  dateStart,
  dateEnd,
  monitorId,
  observerLocation,
}) => {
  const params = {
    query: {
      bool: {
        filter: [
          { exists: { field: 'summary' } },
          {
            range: {
              '@timestamp': {
                gte: dateStart,
                lte: dateEnd,
              },
            },
          },
          ...(monitorId ? [{ term: { 'monitor.id': monitorId } }] : []),
          ...(observerLocation ? [{ term: { 'observer.geo.name': observerLocation } }] : []),
        ] as QueryDslQueryContainer[],
      },
    },
    size: 1,
    _source: ['url', 'monitor', 'observer', '@timestamp', 'tls.*', 'http', 'error', 'tags'],
    sort: {
      '@timestamp': { order: 'desc' as const },
    },
  };

  const { body: result } = await uptimeEsClient.search({ body: params });

  const doc = result.hits?.hits?.[0];
  const docId = (doc?._id as string | undefined) ?? '';
  const { tls, ...ping } = (doc?._source as Ping & { '@timestamp': string }) ?? {};

  return {
    ...ping,
    docId,
    timestamp: ping['@timestamp'],
    tls,
  };
};
