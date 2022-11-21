/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { PingStatus } from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';

import { PingStatusState } from '.';

type PingSelectorReturnType = (state: SyntheticsAppState) => PingStatus[];

const getState = (appState: SyntheticsAppState) => appState.pingStatus;

export const selectIsMonitorStatusesLoading = createSelector(getState, (state) => state.loading);

export const selectPingStatusesForMonitorAndLocationAsc = (
  monitorId: string,
  locationId: string
): PingSelectorReturnType =>
  createSelector([(state: SyntheticsAppState) => state.pingStatus], (state: PingStatusState) => {
    return Object.values(state?.pingStatuses?.[monitorId]?.[locationId] ?? {}).sort(
      (a, b) => Number(new Date(a.timestamp)) - Number(new Date(b.timestamp))
    );
  });
