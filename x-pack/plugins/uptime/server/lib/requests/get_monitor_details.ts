/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import {
  MonitorDetails,
  MonitorError,
} from '../../../../../legacy/plugins/uptime/common/runtime_types';
import { INDEX_NAMES } from '../../../../../legacy/plugins/uptime/common/constants';

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
}

export const getMonitorDetails: UMElasticsearchQueryFn<
  GetMonitorDetailsParams,
  MonitorDetails
> = async ({ callES, monitorId, dateStart, dateEnd }) => {
  const queryFilters: any = [
    {
      range: {
        '@timestamp': {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    },
    {
      term: {
        'monitor.id': monitorId,
      },
    },
  ];

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 1,
      _source: ['error', '@timestamp'],
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'error',
              },
            },
          ],
          filter: queryFilters,
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

  const data = result.hits.hits[0]?._source;

  const monitorError: MonitorError | undefined = data?.error;
  const errorTimeStamp: string | undefined = data?.['@timestamp'];

  return {
    monitorId,
    error: monitorError,
    timestamp: errorTimeStamp,
  };
};
