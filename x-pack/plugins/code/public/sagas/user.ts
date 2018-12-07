/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';

import { call, put, takeEvery } from 'redux-saga/effects';
import { loadUserConfig, loadUserConfigFailed, loadUserConfigSuccess } from '../actions';

function requestUserConfig() {
  return kfetch({
    pathname: `../api/code/user/config`,
    method: 'get',
  });
}

function* handleLoadUserConfig(action: Action<any>) {
  try {
    const data = yield call(requestUserConfig);
    yield put(loadUserConfigSuccess(data));
  } catch (err) {
    yield put(loadUserConfigFailed(err));
  }
}

export function* watchLoadUserConfig() {
  yield takeEvery(String(loadUserConfig), handleLoadUserConfig);
}
