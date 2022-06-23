/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { syntheticsMonitorReducer } from './monitor_summary/synthetics_montior_reducer';
import { monitorStatusReducer } from './monitor_summary';
import { uiReducer } from './ui';
import { indexStatusReducer } from './index_status';
import { syntheticsEnablementReducer } from './synthetics_enablement';
import { monitorListReducer } from './monitor_list';
import { serviceLocationsReducer } from './service_locations';

export const rootReducer = combineReducers({
  ui: uiReducer,
  indexStatus: indexStatusReducer,
  syntheticsEnablement: syntheticsEnablementReducer,
  monitorList: monitorListReducer,
  serviceLocations: serviceLocationsReducer,
  monitorStatus: monitorStatusReducer,
  syntheticsMonitor: syntheticsMonitorReducer,
});

export type SyntheticsAppState = ReturnType<typeof rootReducer>;
