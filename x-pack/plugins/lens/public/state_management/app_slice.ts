/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { LensAppState } from './types';

export const initialState: LensAppState = {
  searchSessionId: '',
  filters: [],
  query: { language: 'kuery', query: '' },
  resolvedDateRange: { fromDate: '', toDate: '' },

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
    onChangeFromEditorFrame: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      return {
        ...state,
        ...payload,
      };
    },
    onActiveDataChange: (state, { payload }: PayloadAction<Partial<LensAppState>>) => {
      if (!isEqual(state.activeData, payload?.activeData)) {
        return {
          ...state,
          ...payload,
        };
      }
      return state;
    },
    navigateAway: (state) => state,
  },
});

export const reducer = {
  app: appSlice.reducer,
};
