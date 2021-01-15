/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { IHttpFetchError } from 'src/core/public';
import { getMonitorList, getMonitorListSuccess, getMonitorListFailure } from '../actions';
import { MonitorSummariesResult } from '../../../common/runtime_types';

export interface MonitorList {
  error?: IHttpFetchError;
  loading: boolean;
  list: MonitorSummariesResult;
}

export const initialState: MonitorList = {
  list: {
    nextPagePagination: null,
    prevPagePagination: null,
    summaries: [],
  },
  loading: false,
};

type Payload = MonitorSummariesResult & IHttpFetchError;

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
    [String(getMonitorListFailure)]: (state: MonitorList, action: Action<IHttpFetchError>) => ({
      ...state,
      error: action.payload,
      loading: false,
    }),
  },
  initialState
);
