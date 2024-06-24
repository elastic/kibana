/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { createReducer } from '@reduxjs/toolkit';

import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';

import { selectDataView, setDataViewData, setPatternList } from './actions';

export interface SelectedDataViewState {
  dataView: DataViewSpec;
  patternList: string[];
  /**
   * There are several states the picker can be in internally:
   * - pristine - not initialized yet
   * - loading
   * - error - some kind of a problem during data init
   * - ready - ready to provide index information to the client
   */
  state: 'pristine' | 'loading' | 'error' | 'ready';
}

export const initialDataView: DataViewSpec = {
  id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
  title: '',
  fields: {},
};

export const initialState: SelectedDataViewState = {
  dataView: initialDataView,
  state: 'pristine',
  patternList: [],
};

export const reducer = createReducer(initialState, (builder) => {
  builder.addCase(selectDataView, (state) => {
    state.state = 'loading';
  });

  builder.addCase(setDataViewData, (state, action) => {
    state.dataView = action.payload;
  });

  builder.addCase(setPatternList, (state, action) => {
    state.patternList = action.payload;
    state.state = 'ready';
  });
});

export type DataviewPickerState = ReturnType<typeof reducer>;
