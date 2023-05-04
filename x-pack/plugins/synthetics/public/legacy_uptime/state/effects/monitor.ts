/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMonitorDetailsAction,
  getMonitorLocationsAction,
  getMonitorLocationsActionSuccess,
  getMonitorLocationsActionFail,
} from '../actions/monitor';
import { fetchMonitorDetails, fetchMonitorLocations } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorDetailsEffect() {
  yield takeLatest(
    getMonitorDetailsAction.get,
    fetchEffectFactory(
      fetchMonitorDetails,
      getMonitorDetailsAction.success,
      getMonitorDetailsAction.fail
    )
  );

  yield takeLatest(
    getMonitorLocationsAction,
    fetchEffectFactory(
      fetchMonitorLocations,
      getMonitorLocationsActionSuccess,
      getMonitorLocationsActionFail
    )
  );
}
