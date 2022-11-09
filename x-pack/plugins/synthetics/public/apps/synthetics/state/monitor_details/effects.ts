/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { getMonitorLastRunAction, getMonitorRecentPingsAction, getMonitorAction } from './actions';
import { fetchSyntheticsMonitor, fetchMonitorRecentPings, fetchMonitorLastRun } from './api';

export function* fetchSyntheticsMonitorEffect() {
  yield takeLeading(
    getMonitorRecentPingsAction.get,
    fetchEffectFactory(
      fetchMonitorRecentPings,
      getMonitorRecentPingsAction.success,
      getMonitorRecentPingsAction.fail
    )
  );

  yield takeLeading(
    getMonitorLastRunAction.get,
    fetchEffectFactory(
      fetchMonitorLastRun,
      getMonitorLastRunAction.success,
      getMonitorLastRunAction.fail
    )
  );
  yield takeLeading(
    getMonitorAction.get,
    fetchEffectFactory(fetchSyntheticsMonitor, getMonitorAction.success, getMonitorAction.fail)
  );
}
