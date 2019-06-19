/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import { call, put, takeEvery, takeLatest, take } from 'redux-saga/effects';
import {
  deleteRepo,
  deleteRepoFailed,
  deleteRepoSuccess,
  fetchRepoConfigFailed,
  fetchRepoConfigs,
  fetchRepoConfigSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  gotoRepo,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
  indexRepo,
  indexRepoFailed,
  indexRepoSuccess,
  initRepoCommand,
  updateDeleteProgress,
  updateIndexProgress,
  gotoRepoFailed,
  loadRepo,
  loadRepoSuccess,
  loadRepoFailed,
} from '../actions';
import { loadLanguageServers } from '../actions/language_server';
import { history } from '../utils/url';
import { adminRoutePattern } from './patterns';

function requestRepos(): any {
  return kfetch({ pathname: '/api/code/repos' });
}

function* handleFetchRepos() {
  try {
    const repos = yield call(requestRepos);
    yield put(fetchReposSuccess(repos));
  } catch (err) {
    yield put(fetchReposFailed(err));
  }
}

function requestDeleteRepo(uri: string) {
  return kfetch({ pathname: `/api/code/repo/${uri}`, method: 'delete' });
}

function requestIndexRepo(uri: string) {
  return kfetch({
    pathname: `/api/code/repo/index/${uri}`,
    method: 'post',
    body: JSON.stringify({ reindex: true }),
  });
}

function* handleDeleteRepo(action: Action<string>) {
  try {
    yield call(requestDeleteRepo, action.payload || '');
    yield put(deleteRepoSuccess(action.payload || ''));
    yield put(
      updateDeleteProgress({
        repoUri: action.payload as string,
        progress: 0,
      })
    );
  } catch (err) {
    yield put(deleteRepoFailed(err));
  }
}

function* handleIndexRepo(action: Action<string>) {
  try {
    yield call(requestIndexRepo, action.payload || '');
    yield put(indexRepoSuccess(action.payload || ''));
    yield put(
      updateIndexProgress({
        repoUri: action.payload as string,
        progress: 0,
      })
    );
  } catch (err) {
    yield put(indexRepoFailed(err));
  }
}

function requestImportRepo(uri: string) {
  return kfetch({
    pathname: '/api/code/repo',
    method: 'post',
    body: JSON.stringify({ url: uri }),
  });
}

function* handleImportRepo(action: Action<string>) {
  try {
    const data = yield call(requestImportRepo, action.payload || '');
    yield put(importRepoSuccess(data));
  } catch (err) {
    yield put(importRepoFailed(err));
  }
}
function* handleFetchRepoConfigs() {
  try {
    const configs = yield call(requestRepoConfigs);
    yield put(fetchRepoConfigSuccess(configs));
  } catch (e) {
    yield put(fetchRepoConfigFailed(e));
  }
}

function requestRepoConfigs() {
  return kfetch({ pathname: '/api/code/workspace', method: 'get' });
}

function* handleInitCmd(action: Action<string>) {
  const repoUri = action.payload as string;
  yield call(requestRepoInitCmd, repoUri);
}

function requestRepoInitCmd(repoUri: string) {
  return kfetch({
    pathname: `/api/code/workspace/${repoUri}/master`,
    query: { force: true },
    method: 'post',
  });
}
function* handleGotoRepo(action: Action<string>) {
  try {
    const repoUri = action.payload as string;
    yield put(loadRepo(repoUri));
    const loadRepoDoneAction = yield take([String(loadRepoSuccess), String(loadRepoFailed)]);
    if (loadRepoDoneAction.type === String(loadRepoSuccess)) {
      history.replace(`/${repoUri}/tree/${loadRepoDoneAction.payload.defaultBranch || 'master'}`);
    } else {
      // redirect to root project path if repo not found to show 404 page
      history.replace(`/${action.payload}/tree/master`);
    }
  } catch (e) {
    history.replace(`/${action.payload}/tree/master`);
    yield put(gotoRepoFailed(e));
  }
}

export function* watchImportRepo() {
  yield takeEvery(String(importRepo), handleImportRepo);
}

export function* watchDeleteRepo() {
  yield takeEvery(String(deleteRepo), handleDeleteRepo);
}

export function* watchIndexRepo() {
  yield takeEvery(String(indexRepo), handleIndexRepo);
}

export function* watchFetchRepos() {
  yield takeEvery(String(fetchRepos), handleFetchRepos);
}

export function* watchFetchRepoConfigs() {
  yield takeEvery(String(fetchRepoConfigs), handleFetchRepoConfigs);
}

export function* watchInitRepoCmd() {
  yield takeEvery(String(initRepoCommand), handleInitCmd);
}

export function* watchGotoRepo() {
  yield takeLatest(String(gotoRepo), handleGotoRepo);
}

function* handleAdminRouteChange() {
  yield put(fetchRepos());
  yield put(fetchRepoConfigs());
  yield put(loadLanguageServers());
}

export function* watchAdminRouteChange() {
  yield takeLatest(adminRoutePattern, handleAdminRouteChange);
}
