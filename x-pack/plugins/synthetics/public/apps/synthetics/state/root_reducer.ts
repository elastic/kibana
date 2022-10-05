/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { networkEventsReducer, NetworkEventsState } from './network_events';
import { monitorDetailsReducer, MonitorDetailsState } from './monitor_details';
import { uiReducer, UiState } from './ui';
import { indexStatusReducer, IndexStatusState } from './index_status';
import { syntheticsEnablementReducer, SyntheticsEnablementState } from './synthetics_enablement';
import { monitorListReducer, MonitorListState } from './monitor_list';
import { serviceLocationsReducer, ServiceLocationsState } from './service_locations';
import { monitorOverviewReducer, MonitorOverviewState } from './overview';
import { BrowserJourneyState } from './browser_journey/models';
import { browserJourneyReducer } from './browser_journey';

export interface SyntheticsAppState {
  ui: UiState;
  indexStatus: IndexStatusState;
  syntheticsEnablement: SyntheticsEnablementState;
  monitorList: MonitorListState;
  serviceLocations: ServiceLocationsState;
  monitorDetails: MonitorDetailsState;
  overview: MonitorOverviewState;
  browserJourney: BrowserJourneyState;
  networkEvents: NetworkEventsState;
}

export const rootReducer = combineReducers<SyntheticsAppState>({
  ui: uiReducer,
  indexStatus: indexStatusReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  monitorList: monitorListReducer,
  serviceLocations: serviceLocationsReducer,
  monitorDetails: monitorDetailsReducer,
  overview: monitorOverviewReducer,
  browserJourney: browserJourneyReducer,
  networkEvents: networkEventsReducer,
});
