/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import queryString from 'query-string';
import { call, put, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import {
  changeSearchScope,
  documentSearch,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
  Match,
  repositorySearch,
} from '../actions';
import { SearchScope } from '../common/types';
import { searchRoutePattern } from './patterns';

function requestDocumentSearch(payload: DocumentSearchPayload) {
  const { query, page, languages, repositories } = payload;
  const queryParams: { [key: string]: string | number | boolean } = {
    q: query,
  };

  if (page) {
    queryParams.p = page;
  }

  if (languages) {
    queryParams.langs = languages;
  }

  if (repositories) {
    queryParams.repos = repositories;
  }

  if (query && query.length > 0) {
    return kfetch({
      pathname: `../api/code/search/doc`,
      method: 'get',
      query: queryParams,
    });
  } else {
    return {
      documents: [],
      took: 0,
      total: 0,
    };
  }
}

function* handleDocumentSearch(action: Action<DocumentSearchPayload>) {
  try {
    const data = yield call(requestDocumentSearch, action.payload!);
    yield put(documentSearchSuccess(data));
  } catch (err) {
    yield put(documentSearchFailed(err));
  }
}

export function* watchDocumentSearch() {
  yield takeLatest(String(documentSearch), handleDocumentSearch);
}

function* handleSearchRouteChange(action: Action<Match>) {
  const { location } = action.payload!;
  const queryParams = queryString.parse(location.search);
  const { q, p, langs, repos, scope } = queryParams;
  yield put(changeSearchScope(scope as string));
  if (scope === SearchScope.repository) {
    yield put(repositorySearch({ query: q as string }));
  }
  yield put(
    documentSearch({
      query: q as string,
      page: p as string,
      languages: langs as string,
      repositories: repos as string,
    })
  );
}

export function* watchSearchRouteChange() {
  yield takeLatest(searchRoutePattern, handleSearchRouteChange);
}
