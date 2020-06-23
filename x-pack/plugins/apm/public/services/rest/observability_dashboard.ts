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
  const serviceCountPromise = callApmApi({
    pathname: '/api/apm/observability-dashboard/service-count',
    params: { query: { start: startTime, end: endTime, bucketSize } },
  });

  const transactionCoordinatesPromise = callApmApi({
    pathname: '/api/apm/observability-dashboard/transactions',
    params: { query: { start: startTime, end: endTime, bucketSize } },
  });

  const [serviceCount, transactionCoordinates] = await Promise.all([
    serviceCountPromise,
    transactionCoordinatesPromise,
  ]);

  return {
    title: i18n.translate('xpack.apm.observabilityDashboard.title', {
      defaultMessage: 'APM',
    }),
    appLink: '/app/apm',
    stats: [
      {
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.stats.services',
          { defaultMessage: 'Services' }
        ),
        value: serviceCount,
      },
    ],
    series: [
      {
        key: 'transactions',
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.chart.transactions',
          { defaultMessage: 'Transactions' }
        ),
        color: 'euiColorVis1',
        coordinates: transactionCoordinates,
      },
    ],
  };
};

export async function hasData() {
  return await callApmApi({
    pathname: '/api/apm/observability-dashboard/hasData',
  });
}
