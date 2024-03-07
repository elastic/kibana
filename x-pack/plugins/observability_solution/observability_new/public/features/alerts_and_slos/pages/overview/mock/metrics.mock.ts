/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsFetchDataResponse, FetchData } from '../../../typings';

export const fetchMetricsData: FetchData<MetricsFetchDataResponse> = () => {
  return Promise.resolve(response);
};

const response: MetricsFetchDataResponse = {
  appLink: '/app/metrics',
  sort: async () => response,
  series: [],
};

export const emptyResponse: MetricsFetchDataResponse = {
  appLink: '/app/metrics',
  sort: async () => emptyResponse,
  series: [],
};
