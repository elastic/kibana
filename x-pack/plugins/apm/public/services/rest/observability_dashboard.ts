/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { mean } from 'lodash';
import {
  ApmFetchDataResponse,
  FetchDataParams,
} from '../../../../observability/public';
import { callApmApi } from './createCallApmApi';

export const fetchLandingPageData = async ({
  startTime,
  endTime,
  bucketSize,
}: FetchDataParams): Promise<ApmFetchDataResponse> => {
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
        value: serviceCount,
      },
      transactions: {
        type: 'number',
        value:
          mean(
            transactionCoordinates
              .map(({ y }) => y)
              .filter((y) => y && isFinite(y))
          ) || 0,
      },
    },
    series: {
      transactions: {
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
