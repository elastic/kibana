/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { FileTree } from '../../model';
import {
  fetchDirectory,
  fetchDirectoryFailed,
  fetchDirectorySuccess,
  fetchFile,
  fetchFileFailed,
  FetchFilePayload,
  FetchFileResponse,
  fetchFileSuccess,
  fetchRepoBranches,
  fetchRepoBranchesFailed,
  fetchRepoBranchesSuccess,
  fetchRepoCommits,
  fetchRepoCommitsFailed,
  fetchRepoCommitsSuccess,
  FetchRepoPayload,
  FetchRepoPayloadWithRevision,
  fetchRepoTree,
  fetchRepoTreeFailed,
  FetchRepoTreePayload,
  fetchRepoTreeSuccess,
  fetchTreeCommits,
  fetchTreeCommitsFailed,
  fetchTreeCommitsSuccess,
  gotoRepo,
  Match,
  openTreePath,
  setNotFound,
} from '../actions';
import { repoRoutePattern } from './patterns';

function* handleFetchRepoTree(action: Action<FetchRepoTreePayload>) {
  try {
    const { uri, revision, path } = action.payload!;
    if (path) {
      yield call(fetchPath, { uri, revision, path });
      const pathSegments = path.split('/');
      let currentPath = '';
      // open all directories on the path
      for (const p of pathSegments) {
        currentPath = currentPath ? `${currentPath}/${p}` : p;
        yield put(openTreePath(currentPath));
      }
    } else {
      yield call(fetchPath, action.payload!);
    }
  } catch (err) {
    yield put(fetchRepoTreeFailed(err));
  }
}

function* fetchPath(payload: FetchRepoTreePayload) {
  const update: FileTree = yield call(requestRepoTree, payload);
  (update.children || []).sort((a, b) => {
    const typeDiff = a.type - b.type;
    if (typeDiff === 0) {
      return a.name > b.name ? 1 : -1;
    } else {
      return -typeDiff;
    }
  });
  update.repoUri = payload.uri;
  yield put(fetchRepoTreeSuccess({ tree: update, path: payload.path }));
  return update;
}

function requestRepoTree({ uri, revision, path, limit = 50 }: FetchRepoTreePayload) {
  return kfetch({
    pathname: `../api/code/repo/${uri}/tree/${revision}/${path}`,
    query: { parents: true, limit, flatten: true },
  });
}

export function* watchFetchRepoTree() {
  yield takeEvery(String(fetchRepoTree), handleFetchRepoTree);
}

function* handleFetchBranches(action: Action<FetchRepoPayload>) {
  try {
    const results = yield call(requestBranches, action.payload!);
    yield put(fetchRepoBranchesSuccess(results));
  } catch (err) {
    yield put(fetchRepoBranchesFailed(err));
  }
}

function requestBranches({ uri }: FetchRepoPayload) {
  return kfetch({
    pathname: `../api/code/repo/${uri}/references`,
  });
}

function* handleFetchCommits(action: Action<FetchRepoPayloadWithRevision>) {
  try {
    const results = yield call(requestCommits, action.payload!);
    yield put(fetchRepoCommitsSuccess(results));
  } catch (err) {
    yield put(fetchRepoCommitsFailed(err));
  }
}

function* handleFetchTreeCommits(action: Action<FetchFilePayload>) {
  try {
    const path = action.payload!.path;
    const commits = yield call(requestCommits, action.payload!, path);
    yield put(fetchTreeCommitsSuccess({ path, commits }));
  } catch (err) {
    yield put(fetchTreeCommitsFailed(err));
  }
}

function requestCommits({ uri, revision }: FetchRepoPayloadWithRevision, path?: string) {
  const pathStr = path ? `/${path}` : '';
  return kfetch({
    pathname: `../api/code/repo/${uri}/history/${revision}${pathStr}`,
  });
}

export async function requestFile(
  payload: FetchFilePayload,
  line?: string
): Promise<FetchFileResponse> {
  const { uri, revision, path } = payload;
  let url = `../api/code/repo/${uri}/blob/${revision}/${path}`;
  if (line) {
    url += '?line=' + line;
  }
  const response: Response = await fetch(url);
  if (response.status === 200) {
    const contentType = response.headers.get('Content-Type');

    if (contentType && contentType.startsWith('text/')) {
      const lang = contentType.split(';')[0].substring('text/'.length);
      return {
        payload,
        lang,
        content: await response.text(),
      };
    } else if (contentType && contentType.startsWith('image/')) {
      return {
        payload,
        isImage: true,
        content: await response.text(),
        url,
      };
    }
  } else if (response.status === 404) {
    return {
      payload,
      isNotFound: true,
    };
  }
  throw new Error('invalid file type');
}

function* handleFetchFile(action: Action<FetchFilePayload>) {
  try {
    const results = yield call(requestFile, action.payload!);
    if (results.isNotFound) {
      yield put(setNotFound(true));
      yield put(fetchFileFailed(new Error('file not found')));
    } else {
      yield put(fetchFileSuccess(results));
    }
  } catch (err) {
    yield put(fetchFileFailed(err));
  }
}

function* handleFetchDirs(action: Action<FetchRepoTreePayload>) {
  try {
    const dir = yield call(requestRepoTree, action.payload!);
    yield put(fetchDirectorySuccess(dir));
  } catch (err) {
    yield fetchDirectoryFailed(err);
  }
}

export function* watchFetchBranchesAndCommits() {
  yield takeEvery(String(fetchRepoBranches), handleFetchBranches);
  yield takeEvery(String(fetchRepoCommits), handleFetchCommits);
  yield takeLatest(String(fetchFile), handleFetchFile);
  yield takeEvery(String(fetchDirectory), handleFetchDirs);
  yield takeLatest(String(fetchTreeCommits), handleFetchTreeCommits);
}

function* handleRepoRouteChange(action: Action<Match>) {
  const { url } = action.payload!;
  yield put(gotoRepo(url));
}

export function* watchRepoRouteChange() {
  yield takeEvery(repoRoutePattern, handleRepoRouteChange);
}
