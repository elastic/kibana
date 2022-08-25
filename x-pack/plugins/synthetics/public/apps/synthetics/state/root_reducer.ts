/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import {
  syntheticsMonitorReducer,
  SyntheticsMonitorState,
} from './monitor_summary/synthetics_montior_reducer';
import { monitorStatusReducer, MonitorSummaryState } from './monitor_summary';
import { uiReducer, UiState } from './ui';
import { indexStatusReducer, IndexStatusState } from './index_status';
import { syntheticsEnablementReducer, SyntheticsEnablementState } from './synthetics_enablement';
import { monitorListReducer, MonitorListState } from './monitor_list';
import { serviceLocationsReducer, ServiceLocationsState } from './service_locations';
import { monitorOverviewReducer, MonitorOverviewState } from './overview';

export interface SyntheticsAppState {
  ui: UiState;
  indexStatus: IndexStatusState;
  syntheticsEnablement: SyntheticsEnablementState;
  monitorList: MonitorListState;
  serviceLocations: ServiceLocationsState;
  monitorStatus: MonitorSummaryState;
  syntheticsMonitor: SyntheticsMonitorState;
  overview: MonitorOverviewState;
}

export const rootReducer = combineReducers<SyntheticsAppState>({
  ui: uiReducer,
  indexStatus: indexStatusReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  monitorList: monitorListReducer,
  serviceLocations: serviceLocationsReducer,
  monitorStatus: monitorStatusReducer,
  syntheticsMonitor: syntheticsMonitorReducer,
  overview: monitorOverviewReducer,
});
