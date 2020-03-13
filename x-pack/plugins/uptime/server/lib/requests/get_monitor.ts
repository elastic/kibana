/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { UMElasticsearchQueryFn } from '../adapters';
import { PingType, Ping } from '../../../../../legacy/plugins/uptime/common/types/ping/ping';
import { INDEX_NAMES } from '../../../../../legacy/plugins/uptime/common/constants';

export interface GetMonitorParams {
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
}

// Get the monitor meta info regardless of timestamp
export const getMonitor: UMElasticsearchQueryFn<GetMonitorParams, Ping> = async ({
  callES,
  monitorId,
}) => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
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
  } else {
    ThrowReporter.report(decoded);
    throw new Error('Received invalid document');
  }
};
