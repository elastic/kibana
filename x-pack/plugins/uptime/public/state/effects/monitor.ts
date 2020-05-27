/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMonitorDetailsAction,
  getMonitorDetailsActionSuccess,
  getMonitorDetailsActionFail,
  getMonitorLocationsAction,
  getMonitorLocationsActionSuccess,
  getMonitorLocationsActionFail,
} from '../actions/monitor';
import { fetchMonitorDetails, fetchMonitorLocations } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorDetailsEffect() {
  yield takeLatest(
    getMonitorDetailsAction,
    fetchEffectFactory(
      fetchMonitorDetails,
      getMonitorDetailsActionSuccess,
      getMonitorDetailsActionFail
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
