/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

const initialState: MonitorStatusState = {
  status: null,
  loading: false,
};

type MonitorStatusPayload = QueryParams & Ping;

export const monitorStatusReducer = handleActions<MonitorStatusState, MonitorStatusPayload>(
  {
    [String(getMonitorStatusAction)]: (state) => ({
      ...state,
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
