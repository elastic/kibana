/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { MonitorStatusHeatmapBucket } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

import {
  clearMonitorStatusHeatmapAction,
  getMonitorStatusHeatmapAction,
  quietGetMonitorStatusHeatmapAction,
} from './actions';

export interface MonitorStatusHeatmap {
  heatmap: MonitorStatusHeatmapBucket[];
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: MonitorStatusHeatmap = {
  heatmap: [],
  loading: false,
  error: null,
};

export const monitorStatusHeatmapReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(quietGetMonitorStatusHeatmapAction.success, (state, action) => {
      state.heatmap = action.payload;
      state.loading = false;
    })
    .addCase(quietGetMonitorStatusHeatmapAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getMonitorStatusHeatmapAction.get, (state) => {
      state.loading = true;
      state.heatmap = [];
    })
    .addCase(getMonitorStatusHeatmapAction.success, (state, action) => {
      state.heatmap = action.payload;
      state.loading = false;
    })
    .addCase(getMonitorStatusHeatmapAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    .addCase(clearMonitorStatusHeatmapAction, (state) => {
      state.heatmap = [];
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
