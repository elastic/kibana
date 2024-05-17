/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { SelectedFilters } from '../actions/selected_filters';
import { AlertState, alertsReducer } from '../alerts/alerts';
import { CertificatesState, certificatesReducer } from '../certificates/certificates';
import { DynamicSettingsState, dynamicSettingsReducer } from './dynamic_settings';
import { IndexStatusState, indexStatusReducer } from './index_status';
import { JourneyKVP, journeyReducer } from './journey';
import { MLJobState, mlJobsReducer } from './ml_anomaly';
import { MonitorState, monitorReducer } from './monitor';
import { MonitorDuration, monitorDurationReducer } from './monitor_duration';
import { MonitorList, monitorListReducer } from './monitor_list';
import { MonitorStatusState, monitorStatusReducer } from './monitor_status';
import { NetworkEventsState, networkEventsReducer } from './network_events';
import { PingState, pingReducer } from './ping';
import { PingListState, pingListReducer } from './ping_list';
import { selectedFiltersReducer } from './selected_filters';
import { SyntheticsReducerState, syntheticsReducer } from './synthetics';
import { UiState, uiReducer } from './ui';

export interface RootState {
  monitor: MonitorState;
  ui: UiState;
  monitorList: MonitorList;
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
}

export const rootReducer = combineReducers<RootState>({
  monitor: monitorReducer,
  ui: uiReducer,
  monitorList: monitorListReducer,
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
});
