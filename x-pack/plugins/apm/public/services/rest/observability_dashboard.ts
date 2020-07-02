/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { sum } from 'lodash';
import { Theme } from '@kbn/ui-shared-deps/theme';
import {
  ApmFetchDataResponse,
  FetchDataParams,
} from '../../../../observability/public';
import { callApmApi } from './createCallApmApi';

interface Options {
  theme: Theme;
}

export const fetchLandingPageData = async (
  { startTime, endTime, bucketSize }: FetchDataParams,
  { theme }: Options
): Promise<ApmFetchDataResponse> => {
  const data = await callApmApi({
    pathname: '/api/apm/observability_dashboard',
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
        type: 'number',
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.stats.services',
          { defaultMessage: 'Services' }
        ),
        value: serviceCount,
      },
      transactions: {
        type: 'number',
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.stats.transactions',
          { defaultMessage: 'Transactions' }
        ),
        value: sum(transactionCoordinates.map((coordinates) => coordinates.y)),
        color: theme.euiColorVis1,
      },
    },
    series: {
      transactions: {
        label: i18n.translate(
          'xpack.apm.observabilityDashboard.chart.transactions',
          { defaultMessage: 'Transactions' }
        ),
        color: theme.euiColorVis1,
        coordinates: transactionCoordinates,
      },
    },
  };
};

export async function hasData() {
  return await callApmApi({
    pathname: '/api/apm/observability_dashboard/has_data',
  });
}
