/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';

import { call, put, takeEvery } from 'redux-saga/effects';
import { loadUserProfile, loadUserProfileFailed, loadUserProfileSuccess } from '../actions';

function requestUserProfile() {
  return kfetch({
    pathname: `/api/security/v1/me`,
    method: 'get',
  });
}

function* handleLoadUserProfile(_: Action<any>) {
  try {
    const data = yield call(requestUserProfile);
    yield put(loadUserProfileSuccess(data));
  } catch (err) {
    yield put(loadUserProfileFailed(err));
  }
}

export function* watchLoadUserProfile() {
  yield takeEvery(String(loadUserProfile), handleLoadUserProfile);
}
