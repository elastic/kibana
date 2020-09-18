/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { monitorReducer } from './monitor';
import { overviewFiltersReducer } from './overview_filters';
import { snapshotReducer } from './snapshot';
import { uiReducer } from './ui';
import { monitorStatusReducer } from './monitor_status';
import { monitorListReducer } from './monitor_list';
import { dynamicSettingsReducer } from './dynamic_settings';
import { indexPatternReducer } from './index_pattern';
import { pingReducer } from './ping';
import { pingListReducer } from './ping_list';
import { monitorDurationReducer } from './monitor_duration';
import { indexStatusReducer } from './index_status';
import { mlJobsReducer } from './ml_anomaly';
import { certificatesReducer } from '../certificates/certificates';
import { selectedFiltersReducer } from './selected_filters';
import { alertsReducer } from '../alerts/alerts';

export const rootReducer = combineReducers({
  monitor: monitorReducer,
  overviewFilters: overviewFiltersReducer,
  snapshot: snapshotReducer,
  ui: uiReducer,
  monitorList: monitorListReducer,
  monitorStatus: monitorStatusReducer,
  dynamicSettings: dynamicSettingsReducer,
  indexPattern: indexPatternReducer,
  ping: pingReducer,
  pingList: pingListReducer,
  ml: mlJobsReducer,
  monitorDuration: monitorDurationReducer,
  indexStatus: indexStatusReducer,
  certificates: certificatesReducer,
  selectedFilters: selectedFiltersReducer,
  alerts: alertsReducer,
});
