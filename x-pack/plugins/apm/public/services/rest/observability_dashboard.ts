/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FetchData } from '../../../../observability/public/typings/data_handler';
import { callApmApi } from './createCallApmApi';

export const fetchData: FetchData = async ({
  startTime,
  endTime,
  bucketSize,
}) => {
  const {
    serviceCount,
    transactionCoordinates,
    errorCoordinates,
  } = await callApmApi({
    pathname: '/api/apm/observability-dashboard',
    params: { query: { start: startTime, end: endTime, bucketSize } },
  });

  return {
    title: i18n.translate('apm.observabilityDashboard.title', {
      defaultMessage: 'APM',
    }),
    appLink: '/app/apm',
    stats: [{ label: 'Services', value: serviceCount }],
    series: [
      {
        key: 'transactions',
        label: i18n.translate('apm.observabilityDashboard.chart.transactions', {
          defaultMessage: 'Transactions',
        }),
        coordinates: transactionCoordinates,
      },
      {
        key: 'errors',
        label: i18n.translate('apm.observabilityDashboard.chart.errors', {
          defaultMessage: 'Errors',
        }),
        coordinates: errorCoordinates,
      },
    ],
  };
};

export async function hasData() {
  return await callApmApi({
    pathname: '/api/apm/observability-dashboard/hasData',
  });
}
