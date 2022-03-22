/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
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
} from '../actions';
import {
  fetchMonitorManagementList,
  fetchServiceLocations,
  fetchCanEnableSynthetics,
  fetchDisableSynthetics,
  fetchEnableSynthetics,
} from '../api';
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
  yield takeLatest(
    getSyntheticsEnablement,
    fetchEffectFactory(
      fetchCanEnableSynthetics,
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
