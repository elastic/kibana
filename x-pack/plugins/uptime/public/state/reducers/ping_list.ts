/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, Action } from 'redux-actions';
import { PingsResponse } from '../../../common/runtime_types';
import { clearPings, getPings, getPingsSuccess, getPingsFail } from '../actions';

export interface PingListState {
  pingList: PingsResponse;
  error?: Error;
  loading: boolean;
}

const initialState: PingListState = {
  pingList: {
    total: 0,
    pings: [],
  },
  loading: false,
};

type PingListPayload = PingsResponse & Error;

export const pingListReducer = handleActions<PingListState, PingListPayload>(
  {
    [String(clearPings)]: (state) => ({
      ...state,
      ...initialState,
    }),
    [String(getPings)]: (state) => ({
      ...state,
      loading: true,
    }),

    [String(getPingsSuccess)]: (state, action: Action<PingsResponse>) => ({
      ...state,
      pingList: { ...action.payload },
      loading: false,
      error: undefined,
    }),

    [String(getPingsFail)]: (state, action: Action<Error>) => ({
      ...state,
      error: action.payload,
      loading: false,
    }),
  },
  initialState
);
