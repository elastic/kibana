/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';
import { call, put, takeEvery } from 'redux-saga/effects';
import {
  loadLanguageServers,
  loadLanguageServersFailed,
  loadLanguageServersSuccess,
  requestInstallLanguageServer,
  requestInstallLanguageServerFailed,
  requestInstallLanguageServerSuccess,
} from '../actions/language_server';

function fetchLangServers() {
  return kfetch({
    pathname: '/api/code/install',
  });
}

function installLanguageServer(languageServer: string) {
  return kfetch({
    pathname: `/api/code/install/${languageServer}`,
    method: 'POST',
  });
}

function* handleInstallLanguageServer(action: Action<string>) {
  try {
    yield call(installLanguageServer, action.payload!);
    yield put(requestInstallLanguageServerSuccess(action.payload!));
  } catch (err) {
    yield put(requestInstallLanguageServerFailed(err));
  }
}

function* handleLoadLanguageServer() {
  try {
    const langServers = yield call(fetchLangServers);
    yield put(loadLanguageServersSuccess(langServers));
  } catch (err) {
    yield put(loadLanguageServersFailed(err));
  }
}

export function* watchLoadLanguageServers() {
  yield takeEvery(String(loadLanguageServers), handleLoadLanguageServer);
}

export function* watchInstallLanguageServer() {
  yield takeEvery(String(requestInstallLanguageServer), handleInstallLanguageServer);
}
