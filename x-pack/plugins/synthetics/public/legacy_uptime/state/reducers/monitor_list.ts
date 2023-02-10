/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, type Action } from 'redux-actions';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { TestNowResponse } from '../../../../common/types';
import {
  getMonitorList,
  getMonitorListSuccess,
  getMonitorListFailure,
  getUpdatedMonitor,
  clearRefreshedMonitorId,
  setUpdatingMonitorId,
} from '../actions';
import type { MonitorSummariesResult } from '../../../../common/runtime_types';
import type { AppState } from '..';

export interface MonitorList {
  loading: boolean;
  isLoaded?: boolean;
  refreshedMonitorIds?: string[];
  isUpdating?: string[];
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
  refreshedMonitorIds: [],
};

type Payload = MonitorSummariesResult &
  IHttpFetchError<ResponseErrorBody> &
  string &
  TestNowResponse;

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
    [String(setUpdatingMonitorId)]: (state: MonitorList, action: Action<string>) => ({
      ...state,
      isUpdating: [...(state.isUpdating ?? []), action.payload],
    }),
    [String(getUpdatedMonitor.get)]: (state: MonitorList) => ({
      ...state,
    }),
    [String(getUpdatedMonitor.success)]: (
      state: MonitorList,
      action: Action<MonitorSummariesResult>
    ) => {
      const summaries = state.list.summaries;

      const newSummary = action.payload.summaries?.[0];

      if (!newSummary) {
        return { ...state, isUpdating: [] };
      }

      return {
        ...state,
        loading: false,
        error: undefined,
        isUpdating: state.isUpdating?.filter((item) => item !== newSummary.monitor_id),
        refreshedMonitorIds: [...(state.refreshedMonitorIds ?? []), newSummary.monitor_id],
        list: {
          ...state.list,
          summaries: summaries.map((summary) => {
            if (summary.monitor_id === newSummary.monitor_id) {
              return newSummary;
            }
            return summary;
          }),
        },
      };
    },
    [String(getUpdatedMonitor.fail)]: (
      state: MonitorList,
      action: Action<IHttpFetchError<ResponseErrorBody>>
    ) => ({
      ...state,
      error: action.payload,
      loading: false,
      isUpdating: [],
    }),
    [String(clearRefreshedMonitorId)]: (state: MonitorList, action: Action<string>) => ({
      ...state,
      refreshedMonitorIds: (state.refreshedMonitorIds ?? []).filter(
        (item) => item !== action.payload
      ),
    }),
  },
  initialState
);

export const refreshedMonitorSelector = ({ monitorList }: AppState) => {
  return monitorList.refreshedMonitorIds ?? [];
};

export const isUpdatingMonitorSelector = ({ monitorList }: AppState) =>
  monitorList.isUpdating ?? [];
