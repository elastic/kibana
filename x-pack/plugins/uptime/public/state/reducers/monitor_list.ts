/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { getMonitorList, getMonitorListSuccess, getMonitorListFailure } from '../actions';
import { MonitorSummariesResult } from '../../../common/runtime_types';

export interface MonitorList {
  error?: Error;
  loading: boolean;
  list: MonitorSummariesResult;
}

export const initialState: MonitorList = {
  list: {
    nextPagePagination: null,
    prevPagePagination: null,
    summaries: [],
    totalSummaryCount: 0,
  },
  loading: false,
};

type Payload = MonitorSummariesResult & Error;

export const monitorListReducer = handleActions<MonitorList, Payload>(
  {
    [String(getMonitorList)]: (state: MonitorList) => ({
      ...state,
      loading: true,
    }),
    [String(getMonitorListSuccess)]: (
      state: MonitorList,
      action: Action<MonitorSummariesResult>
    ) => ({
      ...state,
      loading: false,
      error: undefined,
      list: { ...action.payload },
    }),
    [String(getMonitorListFailure)]: (state: MonitorList, action: Action<Error>) => ({
      ...state,
      error: action.payload,
      loading: false,
    }),
  },
  initialState
);
