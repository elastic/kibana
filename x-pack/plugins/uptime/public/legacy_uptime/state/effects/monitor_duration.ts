/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMonitorDurationAction,
  getMonitorDurationActionFail,
  getMonitorDurationActionSuccess,
} from '../actions';

import { fetchMonitorDuration } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorDurationEffect() {
  yield takeLatest(
    getMonitorDurationAction,
    fetchEffectFactory(
      fetchMonitorDuration,
      getMonitorDurationActionSuccess,
      getMonitorDurationActionFail
    )
  );
}
