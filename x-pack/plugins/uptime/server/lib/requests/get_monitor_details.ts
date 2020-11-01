/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorDetails, Ping } from '../../../common/runtime_types';
import { formatFilterString } from '../alerts/status_check';
import { UptimeESClient } from '../lib';
import { ESSearchBody } from '../../../../apm/typings/elasticsearch';

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  alertsClient: any;
}

const getMonitorAlerts = async ({
  callES,
  dynamicSettings,
  alertsClient,
  monitorId,
}: {
  callES: UptimeESClient;
  dynamicSettings: any;
  alertsClient: any;
  monitorId: string;
}) => {
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
    const esParams: ESSearchBody = {
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
    };

    const parsedFilters = await formatFilterString(
      dynamicSettings,
      callES,
      currAlert.params.filters,
      currAlert.params.search
    );
    esParams.query.bool = Object.assign({}, esParams.query.bool, parsedFilters?.bool);

    const { body: result } = await callES.search({ body: esParams });

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
  };

  const { body: result } = await callES.search({ body: params });

  const data = result.hits.hits[0]?._source as Ping & { '@timestamp': string };

  const errorTimestamp: string | undefined = data?.['@timestamp'];
  const monAlerts = await getMonitorAlerts({
    callES,
    dynamicSettings,
    alertsClient,
    monitorId,
  });

  return {
    monitorId,
    error: data?.error,
    timestamp: errorTimestamp,
    alerts: monAlerts,
  };
};
