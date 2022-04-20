/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, Action } from 'redux-actions';
import {
  getMonitorStatusAction,
  getMonitorStatusActionSuccess,
  getMonitorStatusActionFail,
} from '../actions';
import { Ping } from '../../../common/runtime_types';
import { QueryParams } from '../actions/types';

export interface MonitorStatusState {
  status: Ping | null;
  loading: boolean;
}

export const initialState: MonitorStatusState = {
  status: null,
  loading: false,
};

export type MonitorStatusPayload = QueryParams & Ping;

export const monitorStatusReducer = handleActions<MonitorStatusState, MonitorStatusPayload>(
  {
    [String(getMonitorStatusAction)]: (state, action) => ({
      ...state,
      // reset state if monitorId changes
      status: action.payload.monitorId === state?.status?.monitor?.id ? state.status : null,
      loading: true,
    }),

    [String(getMonitorStatusActionSuccess)]: (state, action: Action<Ping>) => {
      return {
        ...state,
        loading: false,
        // Keeping url from prev request to display, if there is no latest status
        status: {
          url: action.payload?.url || state.status?.url,
          ...action.payload,
        } as Ping,
      };
    },

    [String(getMonitorStatusActionFail)]: (state) => ({
      ...state,
      loading: false,
    }),
  },
  initialState
);
