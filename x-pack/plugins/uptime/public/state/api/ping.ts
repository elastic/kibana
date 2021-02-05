/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIFn } from './types';
import {
  PingsResponseType,
  PingsResponse,
  GetPingsParams,
  GetPingHistogramParams,
  HistogramResult,
} from '../../../common/runtime_types';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

export const fetchPings: APIFn<GetPingsParams, PingsResponse> = async ({
  dateRange: { from, to },
  ...optional
}) => await apiService.get(API_URLS.PINGS, { from, to, ...optional }, PingsResponseType);

export const fetchPingHistogram: APIFn<GetPingHistogramParams, HistogramResult> = async ({
  monitorId,
  dateStart,
  dateEnd,
  filters,
  bucketSize,
  query,
}) => {
  const queryParams = {
    dateStart,
    dateEnd,
    monitorId,
    filters,
    bucketSize,
    query,
  };

  return await apiService.get(API_URLS.PING_HISTOGRAM, queryParams);
};
