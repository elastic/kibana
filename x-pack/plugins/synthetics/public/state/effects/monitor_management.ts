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
  getSyntheticsEnablement,
  getSyntheticsEnablementSuccess,
  getSyntheticsEnablementFailure,
  disableSynthetics,
  disableSyntheticsSuccess,
  disableSyntheticsFailure,
  enableSynthetics,
  enableSyntheticsSuccess,
  enableSyntheticsFailure,
  getSyntheticsServiceAllowed,
} from '../actions';
import {
  fetchMonitorManagementList,
  fetchServiceLocations,
  fetchServiceAllowed,
  fetchGetSyntheticsEnablement,
  fetchDisableSynthetics,
  fetchEnableSynthetics,
} from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorManagementEffect() {
  yield takeLatest(
    getMonitors,
    fetchEffectFactory(fetchMonitorManagementList, getMonitorsSuccess, getMonitorsFailure)
  );
  yield takeLeading(
    getServiceLocations,
    fetchEffectFactory(
      fetchServiceLocations,
      getServiceLocationsSuccess,
      getServiceLocationsFailure
    )
  );
  yield takeLeading(
    getSyntheticsEnablement,
    fetchEffectFactory(
      fetchGetSyntheticsEnablement,
      getSyntheticsEnablementSuccess,
      getSyntheticsEnablementFailure
    )
  );
  yield takeLatest(
    disableSynthetics,
    fetchEffectFactory(fetchDisableSynthetics, disableSyntheticsSuccess, disableSyntheticsFailure)
  );
  yield takeLatest(
    enableSynthetics,
    fetchEffectFactory(fetchEnableSynthetics, enableSyntheticsSuccess, enableSyntheticsFailure)
  );
}

export function* fetchSyntheticsServiceAllowedEffect() {
  yield takeLeading(
    getSyntheticsServiceAllowed.get,
    fetchEffectFactory(
      fetchServiceAllowed,
      getSyntheticsServiceAllowed.success,
      getSyntheticsServiceAllowed.fail
    )
  );
}
