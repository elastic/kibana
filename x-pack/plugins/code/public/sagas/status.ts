/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { put, select, takeEvery } from 'redux-saga/effects';
import { Match, routeChange } from '../actions';
import { loadStatusSuccess } from '../actions/status';
import * as ROUTES from '../components/routes';
import { RootState } from '../reducers';

const matchSelector = (state: RootState) => state.route.match;

const pattern = (action: Action<any>) =>
  action.type === String(loadStatusSuccess) && action.payload!.status.progress === 100;

function* handleRepoCloneSuccess() {
  const match: Match = yield select(matchSelector);
  if (match.path === ROUTES.MAIN || match.path === ROUTES.MAIN_ROOT) {
    yield put(routeChange(match));
  }
}

export function* watchRepoCloneSuccess() {
  yield takeEvery(pattern, handleRepoCloneSuccess);
}
