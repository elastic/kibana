/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../common/constants';
import { apiService } from './utils';
import {
  FetchMonitorStatesQueryArgs,
  MonitorSummariesResult,
  MonitorSummariesResultType,
} from '../../../common/runtime_types';

export const fetchMonitorList = async (
  params: FetchMonitorStatesQueryArgs
): Promise<MonitorSummariesResult> => {
  return await apiService.get(API_URLS.MONITOR_LIST, params, MonitorSummariesResultType);
};
