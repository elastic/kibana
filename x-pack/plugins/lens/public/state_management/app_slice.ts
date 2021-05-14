/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LensAppState } from './types';

const initialState: LensAppState = {
  searchSessionId: '',
  filters: [],
  query: { language: 'kuery', query: '' },

  indexPatternsForTopNav: [],
  isSaveable: false,
  isAppLoading: false,
  isLinkedToOriginatingApp: false,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setState: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    setStateM: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    startSession: (state, { payload }: PayloadAction<{ id: string }>) => {
      state.searchSessionId = payload.id;
    },
    setFilters: (state, { payload }) => {
      state.filters = payload.filters;
      state.searchSessionId = payload.id;
    },
    setQuery: (state, { payload }) => {
      state.query = payload.query;
      state.searchSessionId = payload.id;
    },
    navigateAway: (state) => state,
  },
});

export const reducer = {
  app: appSlice.reducer,
};
