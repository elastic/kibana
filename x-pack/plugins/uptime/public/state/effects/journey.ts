/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';
import {
  getJourneySteps,
  getJourneyStepsSuccess,
  getJourneyStepsFail,
  FetchJourneyStepsParams,
  getStepScreenshot,
  FetchStepScreenshot,
  getStepScreenshotSuccess,
} from '../actions/journey';
import { fetchJourneySteps, fetchStepScreenshot } from '../api/journey';

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

export function* fetchStepScreenshotEffect() {
  yield takeEvery(getStepScreenshot, function* (action: Action<FetchStepScreenshot>) {
    try {
      const response = yield call(fetchStepScreenshot, action.payload);
      yield put(
        getStepScreenshotSuccess({
          screenshot: response,
          checkGroup: action.payload.checkGroup,
          stepIndex: action.payload.stepIndex,
        })
      );
    } catch (err) {
      // TODO: add call to fail action
      console.error(err);
    }
  });
}
