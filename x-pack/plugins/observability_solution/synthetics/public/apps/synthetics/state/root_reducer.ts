/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { DefaultAlertingState, defaultAlertingReducer } from './alert_rules';
import { browserJourneyReducer } from './browser_journey';
import { BrowserJourneyState } from './browser_journey/models';
import { CertificatesState, certificatesReducer } from './certificates/certificates';
import { CertsListState, certsListReducer } from './certs';
import { QueriesState, elasticsearchReducer } from './elasticsearch';
import { GlobalParamsState, globalParamsReducer } from './global_params';
import { ManualTestRunsState, manualTestRunsReducer } from './manual_test_runs';
import { MonitorDetailsState, monitorDetailsReducer } from './monitor_details';
import { MonitorListState, monitorListReducer } from './monitor_list';
import { NetworkEventsState, networkEventsReducer } from './network_events';
import { MonitorOverviewState, monitorOverviewReducer } from './overview';
import { OverviewStatusStateReducer, overviewStatusReducer } from './overview_status';
import { PingStatusState, pingStatusReducer } from './ping_status';
import { AgentPoliciesState, agentPoliciesReducer } from './private_locations';
import { ServiceLocationsState, serviceLocationsReducer } from './service_locations';
import {
  DynamicSettingsState,
  SettingsState,
  dynamicSettingsReducer,
  settingsReducer,
} from './settings';
import { SyntheticsEnablementState, syntheticsEnablementReducer } from './synthetics_enablement';
import { UiState, uiReducer } from './ui';

export interface SyntheticsAppState {
  ui: UiState;
  settings: SettingsState;
  pingStatus: PingStatusState;
  elasticsearch: QueriesState;
  monitorList: MonitorListState;
  overview: MonitorOverviewState;
  certificates: CertificatesState;
  globalParams: GlobalParamsState;
  networkEvents: NetworkEventsState;
  agentPolicies: AgentPoliciesState;
  manualTestRuns: ManualTestRunsState;
  monitorDetails: MonitorDetailsState;
  browserJourney: BrowserJourneyState;
  certsList: CertsListState;
  defaultAlerting: DefaultAlertingState;
  dynamicSettings: DynamicSettingsState;
  serviceLocations: ServiceLocationsState;
  overviewStatus: OverviewStatusStateReducer;
  syntheticsEnablement: SyntheticsEnablementState;
}

export const rootReducer = combineReducers<SyntheticsAppState>({
  ui: uiReducer,
  settings: settingsReducer,
  pingStatus: pingStatusReducer,
  monitorList: monitorListReducer,
  overview: monitorOverviewReducer,
  globalParams: globalParamsReducer,
  networkEvents: networkEventsReducer,
  elasticsearch: elasticsearchReducer,
  agentPolicies: agentPoliciesReducer,
  monitorDetails: monitorDetailsReducer,
  browserJourney: browserJourneyReducer,
  manualTestRuns: manualTestRunsReducer,
  overviewStatus: overviewStatusReducer,
  defaultAlerting: defaultAlertingReducer,
  dynamicSettings: dynamicSettingsReducer,
  serviceLocations: serviceLocationsReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  certificates: certificatesReducer,
  certsList: certsListReducer,
});
