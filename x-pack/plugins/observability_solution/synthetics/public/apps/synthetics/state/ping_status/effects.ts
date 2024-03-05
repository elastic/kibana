/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeEvery } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorPingStatuses } from './api';

import { getMonitorPingStatusesAction } from './actions';

export function* fetchPingStatusesEffect() {
  yield takeEvery(
    getMonitorPingStatusesAction.get,
    fetchEffectFactory(
      fetchMonitorPingStatuses,
      getMonitorPingStatusesAction.success,
      getMonitorPingStatusesAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}
