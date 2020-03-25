/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMElasticsearchQueryFn } from '../adapters';
import { PingType, Ping } from '../../../../../legacy/plugins/uptime/common/runtime_types';

export interface GetMonitorParams {
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
}

// Get the monitor meta info regardless of timestamp
export const getMonitor: UMElasticsearchQueryFn<GetMonitorParams, Ping> = async ({
  callES,
  dynamicSettings,
  monitorId,
}) => {
  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      size: 1,
      _source: ['@timestamp', 'url', 'monitor', 'observer'],
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.id': monitorId,
              },
            },
          ],
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
  };

  const result = await callES('search', params);
  const decoded = PingType.decode(result.hits.hits[0]?._source);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error(JSON.stringify(PathReporter.report(decoded)));
};
