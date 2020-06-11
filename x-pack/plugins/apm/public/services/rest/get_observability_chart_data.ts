/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFetcher } from '../../../../observability/public/typings/data_fetcher';
import { DataAccessHandlerProvider } from '../../../../observability/public/typings/data_access_service';
// import { callApmApi } from './createCallApmApi';

export const getObservabilityChartData: DataAccessHandlerProvider = (
  context,
  params
) => {
  console.log('### caue: params', params);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { time: 1, value: 2, group: 'ga' },
        { time: 2, value: 3, group: 'gb' },
      ]);
    }, 5000);
  });
};

// @ts-ignore
export const getChartData: DataFetcher = ({
  startTime,
  endTime,
  bucketSize,
}) => {};
