/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorDetails, MonitorError } from '../../../common/runtime_types';

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  alertsClient: any;
}

const getMonitorAlerts = async (alertsClient: any) => {
  const options: any = {
    page: 1,
    perPage: 500,
    filter: 'alert.attributes.alertTypeId(xpack.uptime.alerts.monitorStatus)',
    defaultSearchOperator: 'AND',
    sortField: 'name.keyword',
  };

  const findResult = await alertsClient.find({ options });
};

export const getMonitorDetails: UMElasticsearchQueryFn<
  GetMonitorDetailsParams,
  MonitorDetails
> = async ({ callES, dynamicSettings, monitorId, dateStart, dateEnd, alertsClient }) => {
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
    index: dynamicSettings.heartbeatIndices,
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
  const errorTimestamp: string | undefined = data?.['@timestamp'];
  await getMonitorAlerts(alertsClient);
  return {
    monitorId,
    error: monitorError,
    timestamp: errorTimestamp,
  };
};
