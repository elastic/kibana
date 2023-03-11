/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { FiltersList } from '../../components/monitors_page/common/monitor_filters/use_filters';
import { OverviewStatusState } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import {
  clearOverviewStatusErrorAction,
  fetchOverviewStatusAction,
  setListOfFiltersActions,
} from './actions';

export interface OverviewStatusStateReducer {
  loading: boolean;
  loaded: boolean;
  status: OverviewStatusState | null;
  error: IHttpSerializedFetchError | null;
  filtersData?: FiltersList | null;
}

const initialState: OverviewStatusStateReducer = {
  loading: false,
  loaded: false,
  status: null,
  error: null,
  filtersData: null,
};

export const overviewStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchOverviewStatusAction.get, (state) => {
      state.status = null;
    })
    .addCase(fetchOverviewStatusAction.success, (state, action) => {
      state.status = {
        ...action.payload,
        allConfigs: { ...action.payload.upConfigs, ...action.payload.downConfigs },
      };
      state.loaded = true;
    })
    .addCase(fetchOverviewStatusAction.fail, (state, action) => {
      state.error = action.payload;
    })
    .addCase(setListOfFiltersActions, (state, action) => {
      state.filtersData = action.payload;
    })
    .addCase(clearOverviewStatusErrorAction, (state) => {
      state.error = null;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
