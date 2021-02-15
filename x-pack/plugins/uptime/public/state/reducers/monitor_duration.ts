/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, Action } from 'redux-actions';
import {
  getMonitorDurationAction,
  getMonitorDurationActionSuccess,
  getMonitorDurationActionFail,
} from '../actions';
import { MonitorDurationResult } from '../../../common/types';

export interface MonitorDuration {
  durationLines: MonitorDurationResult | null;
  errors: any[];
  loading: boolean;
}

const initialState: MonitorDuration = {
  durationLines: null,
  loading: false,
  errors: [],
};

type Payload = MonitorDurationResult & Error;

export const monitorDurationReducer = handleActions<MonitorDuration, Payload>(
  {
    [String(getMonitorDurationAction)]: (state: MonitorDuration) => ({
      ...state,
      loading: true,
    }),

    [String(getMonitorDurationActionSuccess)]: (
      state: MonitorDuration,
      action: Action<MonitorDurationResult>
    ) => ({
      ...state,
      loading: false,
      durationLines: { ...action.payload },
    }),

    [String(getMonitorDurationActionFail)]: (state: MonitorDuration, action: Action<Error>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
