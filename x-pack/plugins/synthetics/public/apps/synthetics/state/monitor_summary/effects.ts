/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchSyntheticsMonitorAction } from '../monitor_list/actions';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { getMonitorStatusAction } from './actions';
import { fetchMonitorStatus } from './api';
import { fetchSyntheticsMonitor } from '../monitor_list/api';

export function* fetchMonitorStatusEffect() {
  yield takeLeading(
    getMonitorStatusAction.get,
    fetchEffectFactory(
      fetchMonitorStatus,
      getMonitorStatusAction.success,
      getMonitorStatusAction.fail
    )
  );
}

export function* fetchSyntheticsMonitorEffect() {
  yield takeLeading(
    fetchSyntheticsMonitorAction.get,
    fetchEffectFactory(
      fetchSyntheticsMonitor,
      fetchSyntheticsMonitorAction.success,
      fetchSyntheticsMonitorAction.fail
    )
  );
}
