/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { SyntheticsAppState } from '../root_reducer';

const getState = (appState: SyntheticsAppState) => appState.monitorDetails;

export const selectorMonitorDetailsState = createSelector(getState, (state) => state);

export const selectSelectedLocationId = createSelector(
  getState,
  (state) => state.selectedLocationId
);

export const selectLatestPing = createSelector(getState, (state) => state.pings.data[0] ?? null);

export const selectPingsLoading = createSelector(getState, (state) => state.loading);

export const selectMonitorPingsMetadata = createSelector(getState, (state) => state.pings);

export const selectMonitorRecentPings = createSelector(getState, (state) => state.pings.data);

export const selectPingsError = createSelector(getState, (state) => state.error);
