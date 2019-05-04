/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Action } from 'redux-actions';
import { delay } from 'redux-saga';
import { kfetch } from 'ui/kfetch';
import { all, call, put, takeEvery, takeLatest } from 'redux-saga/effects';

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
    pathname: `/api/code/repo/status/${repoUri}`,
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

function isInProgress(progress: number): boolean {
  return progress < WorkerReservedProgress.COMPLETED && progress >= WorkerReservedProgress.INIT;
}

function* handleRepoListStatusLoaded(action: Action<any>) {
  const statuses = action.payload;
  for (const repoUri of Object.keys(statuses)) {
    const status = statuses[repoUri];
    if (status.deleteStatus) {
      yield put(pollRepoDeleteStatus(repoUri));
    } else if (status.indexStatus) {
      if (isInProgress(status.indexStatus.progress)) {
        yield put(pollRepoIndexStatus(repoUri));
      }
    } else if (status.gitStatus) {
      if (isInProgress(status.gitStatus.progress)) {
        yield put(pollRepoCloneStatus(repoUri));
      }
    }
  }
}

// `fetchReposSuccess` is issued by the repository admin page.
export function* watchLoadRepoListStatus() {
  yield takeEvery(String(fetchReposSuccess), handleRepoListStatus);
  // After all the status of all the repositoriesin the list has been loaded,
  // start polling status only for those still in progress.
  yield takeEvery(String(loadStatusSuccess), handleRepoListStatusLoaded);
}

// `loadRepoSuccess` is issued by the main source view page.
export function* watchLoadRepoStatus() {
  yield takeLatest(String(loadRepoSuccess), handleRepoStatus);
}

const REPO_STATUS_POLLING_FREQ_MS = 1000;

function createRepoStatusPollingHandler(
  parseRepoUri: (_: Action<any>) => RepositoryUri,
  handleStatus: any,
  pollingActionFunction: any
) {
  return function*(a: Action<any>) {
    yield call(delay, REPO_STATUS_POLLING_FREQ_MS);

    const repoUri = parseRepoUri(a);
    let keepPolling = false;
    try {
      const repoStatus = yield call(fetchStatus, repoUri);
      keepPolling = yield handleStatus(repoStatus, repoUri);
    } catch (err) {
      // Fetch repository status error. Ignore and keep trying.
      keepPolling = true;
    }

    if (keepPolling) {
      yield put(pollingActionFunction(repoUri));
    }
  };
}

const handleRepoCloneStatusPolling = createRepoStatusPollingHandler(
  (action: Action<any>) => {
    if (action.type === String(importRepo)) {
      const repoUrl: string = action.payload;
      return RepositoryUtils.buildRepository(repoUrl).uri;
    } else if (action.type === String(pollRepoCloneStatus)) {
      return action.payload;
    }
  },
  function*(status: any, repoUri: RepositoryUri) {
    if (
      // Repository has been deleted during the clone
      (!status.gitStatus && !status.indexStatus && !status.deleteStatus) ||
      // Repository is in delete during the clone
      status.deleteStatus
    ) {
      // Stop polling git progress
      return false;
    }

    if (status.gitStatus) {
      const { progress, cloneProgress, errorMessage, timestamp } = status.gitStatus;
      yield put(
        updateCloneProgress({
          progress,
          timestamp: moment(timestamp).toDate(),
          repoUri,
          errorMessage,
          cloneProgress,
        })
      );
      // Keep polling if the progress is not 100% yet.
      return isInProgress(progress);
    } else {
      // Keep polling if the indexStatus has not been persisted yet.
      return true;
    }
  },
  pollRepoCloneStatus
);

export function* watchRepoCloneStatusPolling() {
  // The repository clone status polling will be triggered by:
  // * user click import repository
  // * repeating pollRepoCloneStatus action by the poller itself.
  yield takeEvery([String(importRepo), String(pollRepoCloneStatus)], handleRepoCloneStatusPolling);
}

const handleRepoIndexStatusPolling = createRepoStatusPollingHandler(
  (action: Action<any>) => {
    if (action.type === String(indexRepo) || action.type === String(pollRepoIndexStatus)) {
      return action.payload;
    } else if (action.type === String(updateCloneProgress)) {
      return action.payload.repoUri;
    }
  },
  function*(status: any, repoUri: RepositoryUri) {
    if (
      // Repository has been deleted during the index
      (!status.gitStatus && !status.indexStatus && !status.deleteStatus) ||
      // Repository is in delete during the index
      status.deleteStatus
    ) {
      // Stop polling index progress
      return false;
    }

    if (status.indexStatus) {
      yield put(
        updateIndexProgress({
          progress: status.indexStatus.progress,
          timestamp: moment(status.indexStatus.timestamp).toDate(),
          repoUri,
        })
      );
      // Keep polling if the progress is not 100% yet.
      return isInProgress(status.indexStatus.progress);
    } else {
      // Keep polling if the indexStatus has not been persisted yet.
      return true;
    }
  },
  pollRepoIndexStatus
);

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

const handleRepoDeleteStatusPolling = createRepoStatusPollingHandler(
  (action: Action<any>) => {
    return action.payload;
  },
  function*(status: any, repoUri: RepositoryUri) {
    if (!status.gitStatus && !status.indexStatus && !status.deleteStatus) {
      // If all the statuses cannot be found, this indicates the the repository has been successfully
      // removed.
      yield put(
        updateDeleteProgress({
          progress: WorkerReservedProgress.COMPLETED,
          repoUri,
        })
      );
      return false;
    }

    if (status.deleteStatus) {
      yield put(
        updateDeleteProgress({
          progress: status.deleteStatus.progress,
          timestamp: moment(status.deleteStatus.timestamp).toDate(),
          repoUri,
        })
      );
      return isInProgress(status.deleteStatus.progress);
    } else {
      // Keep polling if the deleteStatus has not been persisted yet.
      return true;
    }
  },
  pollRepoDeleteStatus
);

export function* watchRepoDeleteStatusPolling() {
  // The repository delete status polling will be triggered by:
  // * user click delete repository
  // * repeating pollRepoDeleteStatus action by the poller itself.
  yield takeEvery(
    [String(deleteRepo), String(pollRepoDeleteStatus)],
    handleRepoDeleteStatusPolling
  );
}
