/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import {
  FetchMonitorStatesQueryArgs,
  MonitorSummariesResult,
} from '../../../../common/runtime_types';

export const getMonitorList = createAction<FetchMonitorStatesQueryArgs>('GET_MONITOR_LIST');
export const getMonitorListSuccess = createAction<MonitorSummariesResult>(
  'GET_MONITOR_LIST_SUCCESS'
);
export const getMonitorListFailure = createAction<Error>('GET_MONITOR_LIST_FAIL');
