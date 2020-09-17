/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESAPICaller, UMElasticsearchQueryFn } from '../adapters';
import { MonitorDetails, MonitorError } from '../../../common/runtime_types';
import { formatFilterString } from '../alerts/status_check';

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  alertsClient: any;
}

const getMonitorAlerts = async (
  callES: ESAPICaller,
  dynamicSettings: any,
  alertsClient: any,
  monitorId: string
) => {
  const options: any = {
    page: 1,
    perPage: 500,
    filter: 'alert.attributes.alertTypeId:(xpack.uptime.alerts.monitorStatus)',
    defaultSearchOperator: 'AND',
    sortField: 'name.keyword',
  };

  const { data } = await alertsClient.find({ options });
  const monitorAlerts = [];
  for (let i = 0; i < data.length; i++) {
    const currAlert = data[i];

    if (currAlert.params.search?.includes(monitorId)) {
      monitorAlerts.push(currAlert);
      continue;
    }
    const esParams: any = {
      index: dynamicSettings.heartbeatIndices,
      body: {
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
        size: 0,
        aggs: {
          monitors: {
            terms: {
              field: 'monitor.id',
              size: 1000,
            },
          },
        },
      },
    };

    const parsedFilters = await formatFilterString(
      dynamicSettings,
      callES,
      currAlert.params.filters,
      currAlert.params.search
    );
    esParams.body.query.bool = Object.assign({}, esParams.body.query.bool, parsedFilters?.bool);

    const result = await callES('search', esParams);

    if (result.hits.total.value > 0) {
      monitorAlerts.push(currAlert);
    }
  }
  return monitorAlerts;
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
  const monAlerts = await getMonitorAlerts(callES, dynamicSettings, alertsClient, monitorId);
  return {
    monitorId,
    error: monitorError,
    timestamp: errorTimestamp,
    alerts: monAlerts,
  };
};
