/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put, takeEvery } from 'redux-saga/effects';

import { Action } from 'redux-actions';
import { serializeHttpFetchError } from '../utils/http_error';
import { EsActionPayload, EsActionResponse, executeEsQueryAction } from './actions';
import { executeEsQueryAPI } from './api';

export function* executeEsQueryEffect() {
  const inProgressRequests = new Set<string>();

  yield takeEvery(
    String(executeEsQueryAction.get),
    function* (action: Action<EsActionPayload>): Generator {
      try {
        if (!inProgressRequests.has(action.payload.name)) {
          inProgressRequests.add(action.payload.name);

          const response = (yield call(executeEsQueryAPI, action.payload)) as EsActionResponse;

          inProgressRequests.delete(action.payload.name);

          yield put(executeEsQueryAction.success(response));
        }
      } catch (e) {
        inProgressRequests.delete(action.payload.name);
        yield put(executeEsQueryAction.fail(serializeHttpFetchError(e, action.payload)));
      }
    }
  );
}
