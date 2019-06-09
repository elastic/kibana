/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Action } from 'redux-actions';
import { delay } from 'redux-saga';
import { kfetch } from 'ui/kfetch';
import {
  all,
  call,
  cancel,
  cancelled,
  fork,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
} from 'redux-saga/effects';

import { Repository, RepositoryUri, WorkerReservedProgress } from '../../model';
import * as ROUTES from '../components/routes';
import { allStatusSelector, repoUriSelector, routeSelector } from '../selectors';
import {
  deleteRepo,
  fetchReposSuccess,
  indexRepo,
  loadRepoSuccess,
  loadStatusFailed,
  loadStatusSuccess,
  pollRepoCloneStatusStart,
  pollRepoDeleteStatusStart,
  pollRepoIndexStatusStart,
  routeChange,
  updateCloneProgress,
  updateDeleteProgress,
  updateIndexProgress,
  pollRepoCloneStatusStop,
  pollRepoDeleteStatusStop,
  pollRepoIndexStatusStop,
  importRepoSuccess,
} from '../actions';
import { RepoState } from '../reducers';
import {
  cloneCompletedPattern,
  cloneRepoStatusPollingStopPattern,
  deleteRepoStatusPollingStopPattern,
  indexRepoStatusPollingStopPattern,
} from './status';

const REPO_STATUS_POLLING_FREQ_MS = 1000;

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

// Try to trigger the repository status polling based on its current state.
function* triggerPollRepoStatus(state: RepoState, repoUri: RepositoryUri) {
  switch (state) {
    case RepoState.CLONING:
      yield put(pollRepoCloneStatusStart(repoUri));
      break;
    case RepoState.INDEXING:
      yield put(pollRepoIndexStatusStart(repoUri));
      break;
    case RepoState.DELETING:
      yield put(pollRepoDeleteStatusStart(repoUri));
      break;
    default:
      break;
  }
}

function* handleReposStatusLoaded(action: Action<any>) {
  const route = yield select(routeSelector);
  const allStatuses = yield select(allStatusSelector);
  if (route.path === ROUTES.ADMIN) {
    // Load all repository status on admin page
    for (const repoUri of Object.keys(allStatuses)) {
      const status = allStatuses[repoUri];
      yield triggerPollRepoStatus(status.state, repoUri);
    }
  } else if (route.path === ROUTES.MAIN || route.path === ROUTES.MAIN_ROOT) {
    // Load current repository status on main page
    const currentUri = yield select(repoUriSelector);
    const status = allStatuses[currentUri];
    if (status) {
      yield triggerPollRepoStatus(status.state, currentUri);
    }
  }
}

export function* watchLoadRepoListStatus() {
  // After all the repositories have been loaded, we should start load
  // their status.
  yield takeEvery(String(fetchReposSuccess), handleRepoListStatus);
}

export function* watchLoadRepoStatus() {
  // `loadRepoSuccess` is issued by the main source view page.
  yield takeLatest(String(loadRepoSuccess), handleRepoStatus);
}

export function* watchPollingRepoStatus() {
  // After the status of the repos or a given repo has been loaded, check
  // if we need to start polling the status.
  yield takeEvery(String(loadStatusSuccess), handleReposStatusLoaded);
}

function* handleResetPollingStatus(action: Action<any>) {
  const statuses = yield select(allStatusSelector);
  for (const repoUri of Object.keys(statuses)) {
    yield put(pollRepoCloneStatusStop(repoUri));
    yield put(pollRepoIndexStatusStop(repoUri));
    yield put(pollRepoDeleteStatusStop(repoUri));
  }
}

export function* watchResetPollingStatus() {
  // Stop all the repository status polling runners when route changes.
  yield takeEvery(routeChange, handleResetPollingStatus);
}

const parseCloneStatusPollingRequest = (action: Action<any>) => {
  if (action.type === String(importRepoSuccess)) {
    return action.payload.uri;
  } else if (action.type === String(pollRepoCloneStatusStart)) {
    return action.payload;
  }
};

const handleRepoCloneStatusProcess = function*(status: any, repoUri: RepositoryUri) {
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
};

export function* watchRepoCloneStatusPolling() {
  // The repository clone status polling will be triggered by:
  // * user click import repository
  // * repository status has been loaded and it's in cloning
  yield takeEvery(
    [String(importRepoSuccess), String(pollRepoCloneStatusStart)],
    pollRepoCloneStatusRunner
  );
}

const parseIndexStatusPollingRequest = (action: Action<any>) => {
  if (action.type === String(indexRepo) || action.type === String(pollRepoIndexStatusStart)) {
    return action.payload;
  } else if (action.type === String(updateCloneProgress)) {
    return action.payload.repoUri;
  }
};

const handleRepoIndexStatusProcess = function*(status: any, repoUri: RepositoryUri) {
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
};

export function* watchRepoIndexStatusPolling() {
  // The repository index status polling will be triggered by:
  // * user click index repository
  // * clone is done
  // * repository status has been loaded and it's in indexing
  yield takeEvery(
    [String(indexRepo), cloneCompletedPattern, String(pollRepoIndexStatusStart)],
    pollRepoIndexStatusRunner
  );
}

const parseDeleteStatusPollingRequest = (action: Action<any>) => {
  return action.payload;
};

const handleRepoDeleteStatusProcess = function*(status: any, repoUri: RepositoryUri) {
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
};

export function* watchRepoDeleteStatusPolling() {
  // The repository delete status polling will be triggered by:
  // * user click delete repository
  // * repository status has been loaded and it's in deleting
  yield takeEvery(
    [String(deleteRepo), String(pollRepoDeleteStatusStart)],
    pollRepoDeleteStatusRunner
  );
}

function createRepoStatusPollingRun(handleStatus: any, pollingStopActionFunction: any) {
  return function*(repoUri: RepositoryUri) {
    try {
      while (true) {
        // Delay at the beginning to allow some time for the server to consume the
        // queue task.
        yield call(delay, REPO_STATUS_POLLING_FREQ_MS);

        const repoStatus = yield call(fetchStatus, repoUri);
        const keepPolling = yield handleStatus(repoStatus, repoUri);
        if (!keepPolling) {
          yield put(pollingStopActionFunction(repoUri));
        }
      }
    } finally {
      if (yield cancelled()) {
        // Do nothing here now.
      }
    }
  };
}

function createRepoStatusPollingRunner(
  parseRepoUri: (_: Action<any>) => RepositoryUri,
  pollStatusRun: any,
  pollingStopActionFunction: any,
  pollingStopActionFunctionPattern: any
) {
  return function*(action: Action<any>) {
    const repoUri = parseRepoUri(action);

    // Cancel existing runner to deduplicate the polling
    yield put(pollingStopActionFunction(repoUri));

    // Make a fork to run the repo index status polling
    const task = yield fork(pollStatusRun, repoUri);

    // Wait for the cancellation task
    yield take(pollingStopActionFunctionPattern(repoUri));

    // Cancel the task
    yield cancel(task);
  };
}

const runPollRepoCloneStatus = createRepoStatusPollingRun(
  handleRepoCloneStatusProcess,
  pollRepoCloneStatusStop
);

const runPollRepoIndexStatus = createRepoStatusPollingRun(
  handleRepoIndexStatusProcess,
  pollRepoIndexStatusStop
);

const runPollRepoDeleteStatus = createRepoStatusPollingRun(
  handleRepoDeleteStatusProcess,
  pollRepoDeleteStatusStop
);

const pollRepoCloneStatusRunner = createRepoStatusPollingRunner(
  parseCloneStatusPollingRequest,
  runPollRepoCloneStatus,
  pollRepoCloneStatusStop,
  cloneRepoStatusPollingStopPattern
);

const pollRepoIndexStatusRunner = createRepoStatusPollingRunner(
  parseIndexStatusPollingRequest,
  runPollRepoIndexStatus,
  pollRepoIndexStatusStop,
  indexRepoStatusPollingStopPattern
);

const pollRepoDeleteStatusRunner = createRepoStatusPollingRunner(
  parseDeleteStatusPollingRequest,
  runPollRepoDeleteStatus,
  pollRepoDeleteStatusStop,
  deleteRepoStatusPollingStopPattern
);
