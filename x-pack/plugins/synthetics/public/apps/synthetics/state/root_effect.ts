/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { all, fork } from 'redux-saga/effects';
import { fetchMonitorListEffect } from './monitor_management/monitor_list';
import { fetchServiceLocationsEffect } from './monitor_management/service_locations';
import { fetchIndexStatusEffect } from './index_status';

export const rootEffect = function* root(): Generator {
  yield all([
    fork(fetchIndexStatusEffect),
    fork(fetchServiceLocationsEffect),
    fork(fetchMonitorListEffect),
  ]);
};
