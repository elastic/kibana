/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import mean from 'lodash.mean';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FetchDataParams } from '../../../../observability/public/data_handler';
import { ApmFetchDataResponse } from '../../../../observability/public/typings/fetch_data_response';
import { callApmApi } from './createCallApmApi';
import { Theme } from '../../utils/get_theme';

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
        value:
          mean(
            transactionCoordinates
              .map(({ y }) => y)
              .filter((y) => y && isFinite(y))
          ) || 0,
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
