/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest, takeLeading } from 'redux-saga/effects';
import {
  getMonitors,
  getMonitorsSuccess,
  getMonitorsFailure,
  getServiceLocations,
  getServiceLocationsSuccess,
  getServiceLocationsFailure,
  getSyntheticsServiceEnabled,
} from '../actions';
import { fetchMonitorManagementList, fetchServiceEnabled, fetchServiceLocations } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorManagementEffect() {
  yield takeLatest(
    getMonitors,
    fetchEffectFactory(fetchMonitorManagementList, getMonitorsSuccess, getMonitorsFailure)
  );
  yield takeLatest(
    getServiceLocations,
    fetchEffectFactory(
      fetchServiceLocations,
      getServiceLocationsSuccess,
      getServiceLocationsFailure
    )
  );
}

export function* fetchSyntheticsServiceEnabledEffect() {
  yield takeLeading(
    getSyntheticsServiceEnabled.get,
    fetchEffectFactory(
      fetchServiceEnabled,
      getSyntheticsServiceEnabled.success,
      getSyntheticsServiceEnabled.fail
    )
  );
}
