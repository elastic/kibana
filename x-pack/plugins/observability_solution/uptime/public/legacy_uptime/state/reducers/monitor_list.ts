/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, type Action } from 'redux-actions';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { getMonitorList, getMonitorListSuccess, getMonitorListFailure } from '../actions';
import type { MonitorSummariesResult } from '../../../../common/runtime_types';

export interface MonitorList {
  loading: boolean;
  isLoaded?: boolean;
  list: MonitorSummariesResult;
  error?: IHttpFetchError<ResponseErrorBody>;
}

export const initialState: MonitorList = {
  list: {
    nextPagePagination: null,
    prevPagePagination: null,
    summaries: [],
  },
  loading: false,
  isLoaded: false,
};

type Payload = MonitorSummariesResult & IHttpFetchError<ResponseErrorBody> & string;

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
      isLoaded: true,
      error: undefined,
      list: { ...action.payload },
    }),
    [String(getMonitorListFailure)]: (
      state: MonitorList,
      action: Action<IHttpFetchError<ResponseErrorBody>>
    ) => ({
      ...state,
      error: action.payload,
      loading: false,
      isLoaded: true,
    }),
  },
  initialState
);
