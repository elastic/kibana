/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { IHttpSerializedFetchError } from '../utils/http_error';
import { StatesIndexStatus } from '../../../../../common/runtime_types';

import { getIndexStatus, getIndexStatusSuccess, getIndexStatusFail } from './actions';

export interface IndexStatusState {
  data: StatesIndexStatus | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: IndexStatusState = {
  data: null,
  loading: false,
  error: null,
};

export const indexStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getIndexStatus, (state) => {
      state.loading = true;
    })
    .addCase(getIndexStatusSuccess, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getIndexStatusFail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
