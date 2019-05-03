/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';
import { call, put, takeEvery } from 'redux-saga/effects';
import { Match } from '../actions';
import { loadBlame, loadBlameFailed, LoadBlamePayload, loadBlameSuccess } from '../actions/blame';
import { blamePattern } from './patterns';

function requestBlame(repoUri: string, revision: string, path: string) {
  return kfetch({
    pathname: `/api/code/repo/${repoUri}/blame/${encodeURIComponent(revision)}/${path}`,
  });
}

function* handleFetchBlame(action: Action<LoadBlamePayload>) {
  try {
    const { repoUri, revision, path } = action.payload!;
    const blame = yield call(requestBlame, repoUri, revision, path);
    yield put(loadBlameSuccess(blame));
  } catch (err) {
    yield put(loadBlameFailed(err));
  }
}

export function* watchLoadBlame() {
  yield takeEvery(String(loadBlame), handleFetchBlame);
}

function* handleBlame(action: Action<Match>) {
  const { resource, org, repo, revision, path } = action.payload!.params;
  const repoUri = `${resource}/${org}/${repo}`;
  yield put(loadBlame({ repoUri, revision, path }));
}

export function* watchBlame() {
  yield takeEvery(blamePattern, handleBlame);
}
