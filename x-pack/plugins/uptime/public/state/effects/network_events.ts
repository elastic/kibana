/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, put, takeLatest } from 'redux-saga/effects';
import {
  getNetworkEvents,
  getNetworkEventsSuccess,
  getNetworkEventsFail,
  FetchNetworkEventsParams,
} from '../actions/network_events';
import { fetchNetworkEvents } from '../api/network_events';

export function* fetchNetworkEventsEffect() {
  yield takeLatest(getNetworkEvents, function* (action: Action<FetchNetworkEventsParams>) {
    try {
      const response = yield call(fetchNetworkEvents, action.payload);

      yield put(
        getNetworkEventsSuccess({
          checkGroup: action.payload.checkGroup,
          stepIndex: action.payload.stepIndex,
          ...response,
        })
      );
    } catch (e) {
      yield put(
        getNetworkEventsFail({
          checkGroup: action.payload.checkGroup,
          stepIndex: action.payload.stepIndex,
          error: e,
        })
      );
    }
  });
}
