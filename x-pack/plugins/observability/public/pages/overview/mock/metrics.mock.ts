/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsFetchDataResponse, FetchData } from '../../../typings';

export const fetchMetricsData: FetchData<MetricsFetchDataResponse> = () => {
  return Promise.resolve(response);
};

const response: MetricsFetchDataResponse = {
  appLink: '/app/apm',
  stats: {
    hosts: { value: 11, type: 'number' },
    cpu: { value: 0.8, type: 'percent' },
    memory: { value: 0.362, type: 'percent' },
  },
};

export const emptyResponse: MetricsFetchDataResponse = {
  appLink: '/app/apm',
  stats: {
    hosts: { value: 0, type: 'number' },
    cpu: { value: 0, type: 'percent' },
    memory: { value: 0, type: 'percent' },
  },
};
