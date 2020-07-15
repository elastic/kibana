/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import {
  getMLCapabilitiesAction,
  getExistingMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
} from '../actions';
import { fetchEffectFactory } from './fetch_effect';
import {
  getExistingJobs,
  createMLJob,
  fetchAnomalyRecords,
  deleteMLJob,
  getMLCapabilities,
} from '../api/ml_anomaly';
import { deleteAlertAction } from '../actions/alerts';
import { alertSelector } from '../selectors';
import { MonitorIdParam } from '../actions/types';

export function* fetchMLJobEffect() {
  yield takeLatest(
    getExistingMLJobAction.get,
    fetchEffectFactory(getExistingJobs, getExistingMLJobAction.success, getExistingMLJobAction.fail)
  );
  yield takeLatest(
    createMLJobAction.get,
    fetchEffectFactory(createMLJob, createMLJobAction.success, createMLJobAction.fail)
  );
  yield takeLatest(
    getAnomalyRecordsAction.get,
    fetchEffectFactory(
      fetchAnomalyRecords,
      getAnomalyRecordsAction.success,
      getAnomalyRecordsAction.fail
    )
  );

  yield takeLatest(String(deleteMLJobAction.get), function* (action: Action<MonitorIdParam>) {
    try {
      const response = yield call(deleteMLJob, action.payload);
      yield put(deleteMLJobAction.success(response));

      // let's delete alert as well if it's there
      const { data: anomalyAlert } = yield select(alertSelector);
      if (anomalyAlert) {
        yield put(deleteAlertAction.get({ alertId: anomalyAlert.id as string }));
      }
    } catch (err) {
      yield put(deleteMLJobAction.fail(err));
    }
  });

  yield takeLatest(
    getMLCapabilitiesAction.get,
    fetchEffectFactory(
      getMLCapabilities,
      getMLCapabilitiesAction.success,
      getMLCapabilitiesAction.fail
    )
  );
}
