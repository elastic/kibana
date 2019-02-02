/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { all, call, put, takeEvery } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { Repository } from '../../model';
import { fetchReposSuccess } from '../actions';
import { loadRepoSuccess, loadStatusFailed, loadStatusSuccess } from '../actions';

function fetchStatus(repoUri: string) {
  return kfetch({
    pathname: `../api/code/repo/status/${repoUri}`,
  });
}

function* loadRepoListStatus(action: Action<Repository[]>) {
  try {
    const repositories = action.payload!;
    const promises = repositories.map(repo => call(fetchStatus, repo.uri));
    const statuses = yield all(promises);
    yield put(
      loadStatusSuccess(
        statuses.reduce((acc: { [k: string]: any }, status: any) => {
          acc[status.gitStatus.uri] = status;
          return acc;
        }, {})
      )
    );
  } catch (err) {
    yield put(loadStatusFailed(err));
  }
}

function* loadRepoStatus(action: Action<any>) {
  try {
    const repository = action.payload!;
    const repoStatus = yield call(fetchStatus, repository.uri);
    yield put(
      loadStatusSuccess({
        [repository.uri]: repoStatus,
      })
    );
  } catch (err) {
    yield put(loadStatusFailed(err));
  }
}

export function* watchLoadRepoListStatus() {
  yield takeEvery(String(fetchReposSuccess), loadRepoListStatus);
}

export function* watchLoadRepoStatus() {
  yield takeEvery(String(loadRepoSuccess), loadRepoStatus);
}
