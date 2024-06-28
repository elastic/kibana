/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { CertResult, SyntheticsParams } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import { getCertsListAction } from './actions';

export interface CertsListState {
  isLoading?: boolean;
  data?: CertResult;
  error: IHttpSerializedFetchError | null;
  isSaving?: boolean;
  savedData?: SyntheticsParams;
}

const initialState: CertsListState = {
  isLoading: false,
  error: null,
  data: { certs: [], total: 0 },
};

export const certsListReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getCertsListAction.get, (state) => {
      state.isLoading = true;
    })
    .addCase(getCertsListAction.success, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    })
    .addCase(getCertsListAction.fail, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
export * from './api';
