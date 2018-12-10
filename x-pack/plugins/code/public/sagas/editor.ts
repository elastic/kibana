/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { entries } from 'lodash';
import queryString from 'query-string';
import { Action } from 'redux-actions';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import { parseGoto, parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import { FileTree } from '../../model';
import {
  closeReferences,
  fetchFile,
  FetchFilePayload,
  fetchRepoTree,
  fetchTreeCommits,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  loadStructure,
  Match,
  resetRepoTree,
  revealPosition,
} from '../actions';
import { loadRepo, loadRepoFailed, loadRepoSuccess } from '../actions/status';
import { PathTypes } from '../common/types';
import { RootState } from '../reducers';
import { fileSelector, getTree, lastRequestPathSelector, refUrlSelector } from '../selectors';
import { history } from '../utils/url';
import { mainRoutePattern } from './patterns';

function* handleReferences(action: Action<TextDocumentPositionParams>) {
  try {
    const params: TextDocumentPositionParams = action.payload!;
    const response = yield call(requestFindReferences, params);
    const results = entries(response).map((v: any) => ({ repo: v[0], files: v[1] }));
    yield put(findReferencesSuccess(results));
  } catch (error) {
    yield put(findReferencesFailed(error));
  }
}

function requestFindReferences(params: TextDocumentPositionParams) {
  return kfetch({
    pathname: `../api/lsp/findReferences`,
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function* watchLspMethods() {
  yield takeLatest(String(findReferences), handleReferences);
}

function handleCloseReferences() {
  const { pathname, search } = history.location;
  const queryParams = queryString.parse(search);
  if (queryParams.tab) {
    queryParams.tab = undefined;
  }
  if (queryParams.refUrl) {
    queryParams.refUrl = undefined;
  }
  const query = queryString.stringify(queryParams);
  if (query) {
    history.push(`${pathname}?${query}`);
  } else {
    history.push(pathname);
  }
}

export function* watchCloseReference() {
  yield takeLatest(String(closeReferences), handleCloseReferences);
}

function* handleReference(url: string) {
  const refUrl = yield select(refUrlSelector);
  if (refUrl === url) {
    return;
  }
  const { uri, position, schema, repoUri, file, revision } = parseLspUrl(url);
  if (uri && position) {
    yield put(
      findReferences({
        textDocument: {
          uri: toCanonicalUrl({ revision, schema, repoUri, file }),
        },
        position,
      })
    );
  }
}

function* handleFile(repoUri: string, file: string, revision: string) {
  const payload: FetchFilePayload = yield select(fileSelector);
  if (
    payload &&
    payload.path === file &&
    payload.revision === revision &&
    payload.uri === repoUri
  ) {
    return;
  }
  yield put(
    fetchFile({
      uri: repoUri,
      path: file,
      revision,
    })
  );
}

function fetchRepo(repoUri: string) {
  return kfetch({ pathname: `../api/code/repo/${repoUri}` });
}

function* loadRepoSaga(action: any) {
  try {
    const repo = yield call(fetchRepo, action.payload);
    yield put(loadRepoSuccess(repo));
  } catch (e) {
    yield put(loadRepoFailed(e));
  }
}

export function* watchLoadRepo() {
  yield takeEvery(String(loadRepo), loadRepoSaga);
}

function* handleMainRouteChange(action: Action<Match>) {
  const { location } = action.payload!;
  const queryParams = queryString.parse(location.search);
  const { resource, org, repo, path: file, pathType, revision, goto } = action.payload!.params;
  const repoUri = `${resource}/${org}/${repo}`;
  let position;
  if (goto) {
    position = parseGoto(goto);
  }
  yield put(loadRepo(repoUri));
  if (file) {
    if (pathType === PathTypes.blob) {
      yield call(handleFile, repoUri, file, revision);
      if (position) {
        yield put(revealPosition(position));
      }
      const { tab, refUrl } = queryParams;
      if (tab === 'references' && refUrl) {
        yield call(handleReference, decodeURIComponent(refUrl as string));
      }
    } else if (pathType === PathTypes.tree) {
      const commits = yield select((state: RootState) => state.file.treeCommits[file]);
      if (commits === undefined) {
        yield put(fetchTreeCommits({ revision, uri: repoUri, path: file }));
      }
    }
  }
  const lastRequestPath = yield select(lastRequestPathSelector);
  const currentTree: FileTree = yield select(getTree);
  // repo changed
  if (currentTree.repoUri !== repoUri) {
    yield put(resetRepoTree());
  }
  yield put(
    fetchRepoTree({
      uri: repoUri,
      revision,
      path: file || '',
    })
  );
  if (file && pathType === PathTypes.blob) {
    const uri = toCanonicalUrl({
      repoUri,
      file,
      revision,
    });
    if (lastRequestPath !== uri) {
      yield put(loadStructure(uri!));
    }
  }
}

export function* watchMainRouteChange() {
  yield takeLatest(mainRoutePattern, handleMainRouteChange);
}
