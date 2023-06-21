/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { ESSearchResponse } from '@kbn/es-types';

import { IHttpSerializedFetchError } from '..';
import { executeEsQueryAction } from './actions';

export interface QueriesState {
  results: Record<string, ESSearchResponse>;
  loading: Record<string, boolean>;
  error: Record<string, IHttpSerializedFetchError>;
}

const initialState: QueriesState = {
  results: {},
  loading: {},
  error: {},
};

export const elasticsearchReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(executeEsQueryAction.get, (state, action) => {
      const name = action.payload.name;
      state.loading = { ...state.loading, [name]: true };
    })
    .addCase(executeEsQueryAction.success, (state, action) => {
      const name = action.payload.name;
      state.loading = { ...state.loading, [name]: false };
      state.results = { ...state.results, [name]: action.payload.result };
    })
    .addCase(executeEsQueryAction.fail, (state, action) => {
      const name = action.payload.name;
      state.loading = { ...state.loading, [name]: false };
      state.error = { ...state.error, [name]: action.payload };
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
