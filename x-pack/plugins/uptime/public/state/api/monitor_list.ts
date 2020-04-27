/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';
import {
  API_URLS,
  FetchMonitorStatesQueryArgs,
  MonitorSummaryResult,
  MonitorSummaryResultType,
} from '../../../common';

export const fetchMonitorList = async (
  params: FetchMonitorStatesQueryArgs
): Promise<MonitorSummaryResult> => {
  return await apiService.get(API_URLS.MONITOR_LIST, params, MonitorSummaryResultType);
};
