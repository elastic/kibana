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
export const selectorError = createSelector(getState, (state) => state.error);

export const selectSelectedLocationId = createSelector(
  getState,
  (state) => state.selectedLocationId
);

export const selectLastRunMetadata = createSelector(getState, (state) => state.lastRun);

export const selectPingsLoading = createSelector(getState, (state) => state.pings.loading);

export const selectMonitorPingsMetadata = createSelector(getState, (state) => state.pings);

export const selectPingsError = createSelector(getState, (state) => state.error);
