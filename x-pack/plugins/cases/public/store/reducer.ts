/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAction, createReducer } from '@reduxjs/toolkit';

export interface AddToCaseState {
  addToExistingCaseOpenID: string | null;
  createNewCaseOpenID: string | null;
}

export const initialState: AddToCaseState = {
  createNewCaseOpenID: null,
  addToExistingCaseOpenID: null,
};

export const setOpenAddToExistingCase = createAction<string | null>('setOpenAddToExistingCase');
export const setOpenAddToNewCase = createAction<string | null>('setOpenAddToNewCase');

export const addToCaseReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setOpenAddToExistingCase, (state, action) => {
      state.createNewCaseOpenID = null;
      state.addToExistingCaseOpenID = action.payload;
    })
    .addCase(setOpenAddToNewCase, (state, action) => {
      state.addToExistingCaseOpenID = null;
      state.createNewCaseOpenID = action.payload;
    });
});
