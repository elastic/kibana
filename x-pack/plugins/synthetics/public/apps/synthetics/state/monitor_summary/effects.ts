/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { getMonitorStatusAction, getSyntheticsMonitorAction } from './actions';
import { fetchMonitorStatus, fetchSyntheticsMonitor } from './api';

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
    getSyntheticsMonitorAction.get,
    // TODO: not sure why this type was broken, but I don't think I did anything to mess it up (probably did though).
    // fix before merging
    fetchEffectFactory<any, any, any, any>(
      fetchSyntheticsMonitor,
      getSyntheticsMonitorAction.success,
      getSyntheticsMonitorAction.fail
    )
  );
}
