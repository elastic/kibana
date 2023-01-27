/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { deleteMonitorReducer, DeleteMonitorState } from './delete_monitor';
import { agentPoliciesReducer, AgentPoliciesState } from '../private_locations';
import { monitorReducer, MonitorState } from './monitor';
import { uiReducer, UiState } from './ui';
import { monitorStatusReducer, MonitorStatusState } from './monitor_status';
import { monitorListReducer, MonitorList } from './monitor_list';
import { dynamicSettingsReducer, DynamicSettingsState } from './dynamic_settings';
import { pingReducer, PingState } from './ping';
import { pingListReducer, PingListState } from './ping_list';
import { monitorDurationReducer, MonitorDuration } from './monitor_duration';
import { indexStatusReducer, IndexStatusState } from './index_status';
import { mlJobsReducer, MLJobState } from './ml_anomaly';
import { certificatesReducer, CertificatesState } from '../certificates/certificates';
import { selectedFiltersReducer } from './selected_filters';
import { SelectedFilters } from '../actions/selected_filters';
import { alertsReducer, AlertState } from '../alerts/alerts';
import { JourneyKVP, journeyReducer } from './journey';
import { networkEventsReducer, NetworkEventsState } from './network_events';
import { syntheticsReducer, SyntheticsReducerState } from './synthetics';
import { monitorManagementListReducer, MonitorManagementList } from './monitor_management';
import { testNowRunsReducer, TestNowRunsState } from './test_now_runs';

export interface RootState {
  monitor: MonitorState;
  ui: UiState;
  monitorList: MonitorList;
  monitorManagementList: MonitorManagementList;
  monitorStatus: MonitorStatusState;
  dynamicSettings: DynamicSettingsState;
  ping: PingState;
  pingList: PingListState;
  ml: MLJobState;
  monitorDuration: MonitorDuration;
  indexStatus: IndexStatusState;
  certificates: CertificatesState;
  selectedFilters: SelectedFilters | null;
  alerts: AlertState;
  journeys: JourneyKVP;
  networkEvents: NetworkEventsState;
  synthetics: SyntheticsReducerState;
  testNowRuns: TestNowRunsState;
  agentPolicies: AgentPoliciesState;
  deleteMonitor: DeleteMonitorState;
}

export const rootReducer = combineReducers<RootState>({
  monitor: monitorReducer,
  ui: uiReducer,
  monitorList: monitorListReducer,
  monitorManagementList: monitorManagementListReducer,
  monitorStatus: monitorStatusReducer,
  dynamicSettings: dynamicSettingsReducer,
  ping: pingReducer,
  pingList: pingListReducer,
  ml: mlJobsReducer,
  monitorDuration: monitorDurationReducer,
  indexStatus: indexStatusReducer,
  certificates: certificatesReducer,
  selectedFilters: selectedFiltersReducer,
  alerts: alertsReducer,
  journeys: journeyReducer,
  networkEvents: networkEventsReducer,
  synthetics: syntheticsReducer,
  testNowRuns: testNowRunsReducer,
  agentPolicies: agentPoliciesReducer,
  deleteMonitor: deleteMonitorReducer,
});
