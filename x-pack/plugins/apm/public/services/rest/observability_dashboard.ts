/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { sum } from 'lodash';
import {
  ApmFetchDataResponse,
  FetchData,
} from '../../../../observability/public/typings/data_handler';
import { callApmApi } from './createCallApmApi';

export const fetchData: FetchData<ApmFetchDataResponse> = async ({
  startTime,
  endTime,
  bucketSize,
}) => {
  const data = await callApmApi({
    pathname: '/api/apm/observability-dashboard',
    params: { query: { start: startTime, end: endTime, bucketSize } },
  });

  const { serviceCount, transactionCoordinates } = data;

  return {
    title: i18n.translate('xpack.apm.observabilityDashboard.title', {
      defaultMessage: 'APM',
    }),
    appLink: '/app/apm',
    stats: {
      services: {
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.stats.services',
          { defaultMessage: 'Services' }
        ),
        value: serviceCount,
      },
      transactions: {
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.stats.transactions',
          { defaultMessage: 'Transactions' }
        ),
        value: sum(transactionCoordinates.map((coordinates) => coordinates.y)),
      },
    },
    series: {
      transactions: {
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.chart.transactions',
          { defaultMessage: 'Transactions' }
        ),
        color: 'euiColorVis1',
        coordinates: transactionCoordinates,
      },
    },
  };
};

export async function hasData() {
  return await callApmApi({
    pathname: '/api/apm/observability-dashboard/hasData',
  });
}
