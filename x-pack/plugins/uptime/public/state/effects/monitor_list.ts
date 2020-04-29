/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import { getMonitorList, getMonitorListSuccess, getMonitorListFailure } from '../actions';
import { fetchMonitorList } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorListEffect() {
  yield takeLatest(
    getMonitorList,
    fetchEffectFactory(fetchMonitorList, getMonitorListSuccess, getMonitorListFailure)
  );
}
