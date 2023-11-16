/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { SyntheticsParams } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import { addNewGlobalParamAction, editGlobalParamAction, getGlobalParamAction } from './actions';

export interface GlobalParamsState {
  isLoading?: boolean;
  listOfParams?: SyntheticsParams[];
  addError: IHttpSerializedFetchError | null;
  editError: IHttpSerializedFetchError | null;
  isSaving?: boolean;
  savedData?: SyntheticsParams;
}

const initialState: GlobalParamsState = {
  isLoading: false,
  addError: null,
  isSaving: false,
  editError: null,
  listOfParams: [],
};

export const globalParamsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getGlobalParamAction.get, (state) => {
      state.isLoading = true;
    })
    .addCase(getGlobalParamAction.success, (state, action) => {
      state.isLoading = false;
      state.listOfParams = action.payload;
    })
    .addCase(getGlobalParamAction.fail, (state, action) => {
      state.isLoading = false;
    })
    .addCase(addNewGlobalParamAction.get, (state) => {
      state.isSaving = true;
      state.savedData = undefined;
    })
    .addCase(addNewGlobalParamAction.success, (state, action) => {
      state.isSaving = false;
      state.savedData = action.payload;
    })
    .addCase(addNewGlobalParamAction.fail, (state, action) => {
      state.isSaving = false;
      state.addError = action.payload;
    })
    .addCase(editGlobalParamAction.get, (state) => {
      state.isSaving = true;
      state.savedData = undefined;
    })
    .addCase(editGlobalParamAction.success, (state, action) => {
      state.isSaving = false;
      state.savedData = action.payload;
    })
    .addCase(editGlobalParamAction.fail, (state, action) => {
      state.isSaving = false;
      state.editError = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
export * from './api';
