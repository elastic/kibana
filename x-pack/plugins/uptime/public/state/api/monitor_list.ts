/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../common/constants';
import { apiService } from './utils';
import {
  FetchMonitorListHistogramParams,
  FetchMonitorListPaginationParams,
  FetchMonitorStatesQueryArgs,
  MonitorSummariesResult,
  MonitorSummariesResultType,
} from '../../../common/runtime_types';
import { MonitorHistogramResult, MonitorListPaginationResult } from '../../../common/types';

export const fetchMonitorList = async (
  params: FetchMonitorStatesQueryArgs
): Promise<MonitorSummariesResult> => {
  return await apiService.get(API_URLS.MONITOR_LIST, params, MonitorSummariesResultType);
};

export const fetchMonitorListPagination = async (
  params: FetchMonitorListPaginationParams
): MonitorListPaginationResult => {
  return await apiService.get(API_URLS.MONITOR_LIST_PAGINATION, params);
};

export const fetchMonitorListHistogram = async (
  params: Omit<FetchMonitorListHistogramParams, 'monitorIds'>,
  data: { monitorIds: string[] }
): MonitorHistogramResult => {
  return await apiService.post(API_URLS.MONITOR_LIST_HISTOGRAM, data, null, params);
};
