/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { FetchMonitorStatesQueryArgs, MonitorSummariesResult } from '../../../common/runtime_types';
import { createAsyncAction } from './utils';
import { TestNowResponse } from '../api';

export const getMonitorList = createAction<FetchMonitorStatesQueryArgs>('GET_MONITOR_LIST');
export const getMonitorListSuccess = createAction<MonitorSummariesResult>(
  'GET_MONITOR_LIST_SUCCESS'
);
export const getMonitorListFailure = createAction<Error>('GET_MONITOR_LIST_FAIL');

export const setUpdatingMonitorId = createAction<string>('SET_UPDATING_MONITOR_ID');
export const clearRefreshedMonitorId = createAction<string>('CLEAR_REFRESH_MONITOR_ID');

export const testNowMonitorAction = createAsyncAction<string, TestNowResponse | undefined>(
  'TEST_NOW_MONITOR_ACTION'
);

export const clearTestNowMonitorAction = createAction<string>('CLEAR_TEST_NOW_MONITOR_ACTION');

export const getUpdatedMonitor = createAsyncAction<
  FetchMonitorStatesQueryArgs,
  MonitorSummariesResult
>('GET_UPDATED_MONITOR');
