/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, put, takeLatest } from 'redux-saga/effects';
import {
  getJourneySteps,
  getJourneyStepsSuccess,
  getJourneyStepsFail,
  FetchJourneyStepsParams,
} from '../actions/journey';
import { fetchJourneySteps } from '../api/journey';

export function* fetchJourneyStepsEffect() {
  yield takeLatest(getJourneySteps, function* (action: Action<FetchJourneyStepsParams>) {
    try {
      const response = yield call(fetchJourneySteps, action.payload);
      yield put(getJourneyStepsSuccess(response));
    } catch (e) {
      yield put(getJourneyStepsFail({ checkGroup: action.payload.checkGroup, error: e }));
    }
  });
}
