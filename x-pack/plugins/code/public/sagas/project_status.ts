/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { delay } from 'redux-saga';
import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { RepositoryUtils } from '../../common/repository_utils';
import { Repository, RepositoryUri, WorkerReservedProgress } from '../../model';
import {
  deleteRepo,
  fetchReposSuccess,
  importRepo,
  indexRepo,
  loadRepoSuccess,
  loadStatusFailed,
  loadStatusSuccess,
  pollRepoCloneStatus,
  pollRepoDeleteStatus,
  pollRepoIndexStatus,
  updateCloneProgress,
  updateDeleteProgress,
  updateIndexProgress,
} from '../actions';
import { cloneCompletedPattern } from './status';

function fetchStatus(repoUri: string) {
  return kfetch({
    pathname: `../api/code/repo/status/${repoUri}`,
  });
}

function* loadRepoListStatus(repos: Repository[]) {
  try {
    const promises = repos.map(repo => call(fetchStatus, repo.uri));
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

function* loadRepoStatus(repo: Repository) {
  try {
    const repoStatus = yield call(fetchStatus, repo.uri);
    yield put(
      loadStatusSuccess({
        [repo.uri]: repoStatus,
      })
    );
  } catch (err) {
    yield put(loadStatusFailed(err));
  }
}

function* handleRepoStatus(action: Action<any>) {
  const repository: Repository = action.payload!;
  yield call(loadRepoStatus, repository);
}

function* handleRepoListStatus(action: Action<Repository[]>) {
  const repos: Repository[] = action.payload!;
  yield call(loadRepoListStatus, repos);
}

// `fetchReposSuccess` is issued by the repository admin page.
export function* watchLoadRepoListStatus() {
  yield takeEvery(String(fetchReposSuccess), handleRepoListStatus);
}

// `loadRepoSuccess` is issued by the main source view page.
export function* watchLoadRepoStatus() {
  yield takeLatest(String(loadRepoSuccess), handleRepoStatus);
}

const REPO_STATUS_POLLING_FREQ_MS = 1000;
function* handleRepoCloneStatusPolling(action: Action<any>) {
  yield call(delay, REPO_STATUS_POLLING_FREQ_MS);

  let repoUri;
  if (action.type === String(importRepo)) {
    const repoUrl: string = action.payload;
    repoUri = RepositoryUtils.buildRepository(repoUrl).uri;
  } else if (action.type === String(pollRepoCloneStatus)) {
    repoUri = action.payload;
  }

  let keepPolling = false;
  try {
    const repoStatus = yield call(fetchStatus, repoUri);
    if (repoStatus.gitStatus) {
      const { progress, cloneProgress } = repoStatus.gitStatus;
      yield put(
        updateCloneProgress({
          progress,
          repoUri,
          cloneProgress,
        })
      );
      // Keep polling if the progress is not 100% yet.
      keepPolling =
        progress < WorkerReservedProgress.COMPLETED && progress >= WorkerReservedProgress.INIT;
    } else {
      // Keep polling if the indexStatus has not been persisted yet.
      keepPolling = true;
    }
  } catch (err) {
    // Fetch repository status error. Ignore and keep trying.
    keepPolling = true;
  }

  if (keepPolling) {
    yield put(pollRepoCloneStatus(repoUri));
  }
}

export function* watchRepoCloneStatusPolling() {
  // The repository clone status polling will be triggered by:
  // * user click import repository
  // * repeating pollRepoCloneStatus action by the poller itself.
  yield takeEvery([String(importRepo), String(pollRepoCloneStatus)], handleRepoCloneStatusPolling);
}

function* handleRepoIndexStatusPolling(action: Action<any>) {
  yield call(delay, REPO_STATUS_POLLING_FREQ_MS);

  let repoUri;
  if (action.type === String(indexRepo) || action.type === String(pollRepoIndexStatus)) {
    repoUri = action.payload;
  } else if (action.type === String(updateCloneProgress)) {
    repoUri = action.payload.repoUri;
  }

  let keepPolling = false;
  try {
    const repoStatus = yield call(fetchStatus, repoUri);
    if (repoStatus.indexStatus) {
      yield put(
        updateIndexProgress({
          progress: repoStatus.indexStatus.progress,
          repoUri,
        })
      );
      // Keep polling if the progress is not 100% yet.
      keepPolling =
        repoStatus.indexStatus.progress < WorkerReservedProgress.COMPLETED &&
        repoStatus.indexStatus.progress >= WorkerReservedProgress.INIT;
    } else {
      // Keep polling if the indexStatus has not been persisted yet.
      keepPolling = true;
    }
  } catch (err) {
    // Fetch repository status error. Ignore and keep trying.
    keepPolling = true;
  }

  if (keepPolling) {
    yield put(pollRepoIndexStatus(repoUri));
  }
}

export function* watchRepoIndexStatusPolling() {
  // The repository index status polling will be triggered by:
  // * user click index repository
  // * clone is done
  // * repeating pollRepoIndexStatus action by the poller itself.
  yield takeEvery(
    [String(indexRepo), cloneCompletedPattern, String(pollRepoIndexStatus)],
    handleRepoIndexStatusPolling
  );
}

function* handleRepoDeleteStatusPolling(action: Action<any>) {
  yield call(delay, REPO_STATUS_POLLING_FREQ_MS);

  const repoUri: RepositoryUri = action.payload;
  let keepPolling = false;
  try {
    const repoStatus = yield call(fetchStatus, repoUri);
    if (!repoStatus.gitStatus && !repoStatus.indexStatus && !repoStatus.deleteStatus) {
      // If all the statuses cannot be found, this indicates the the repository has been successfully
      // removed.
      yield put(
        updateDeleteProgress({
          progress: WorkerReservedProgress.COMPLETED,
          repoUri,
        })
      );
    }

    if (repoStatus.deleteStatus) {
      yield put(
        updateDeleteProgress({
          progress: repoStatus.deleteStatus.progress,
          repoUri,
        })
      );
      keepPolling =
        repoStatus.deleteStatus.progress < WorkerReservedProgress.COMPLETED &&
        repoStatus.deleteStatus.progress >= WorkerReservedProgress.INIT;
    }
  } catch (err) {
    // Fetch repository status error. Ignore and keep trying.
    keepPolling = true;
  }

  if (keepPolling) {
    // Keep polling if the progress is not 100% yet.
    yield put(pollRepoDeleteStatus(repoUri));
  }
}

export function* watchRepoDeleteStatusPolling() {
  // The repository delete status polling will be triggered by:
  // * user click delete repository
  // * repeating pollRepoDeleteStatus action by the poller itself.
  yield takeEvery(
    [String(deleteRepo), String(pollRepoDeleteStatus)],
    handleRepoDeleteStatusPolling
  );
}
