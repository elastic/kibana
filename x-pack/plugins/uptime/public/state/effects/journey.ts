/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, put, takeEvery } from 'redux-saga/effects';
import {
  getJourneySteps,
  getJourneyStepsSuccess,
  getJourneyStepsFail,
  FetchJourneyStepsParams,
} from '../actions/journey';
import { fetchJourneySteps } from '../api/journey';
import type { SyntheticsJourneyApiResponse } from '../../../common/runtime_types';

const inFlightStepRequests: Record<FetchJourneyStepsParams['checkGroup'], boolean> = {};

export function* fetchJourneyStepsEffect(): Generator {
  yield takeEvery(getJourneySteps, function* (action: Action<FetchJourneyStepsParams>) {
    if (inFlightStepRequests[action.payload.checkGroup]) return;

    try {
      inFlightStepRequests[action.payload.checkGroup] = true;
      const response = (yield call(
        fetchJourneySteps,
        action.payload
      )) as SyntheticsJourneyApiResponse;
      yield put(getJourneyStepsSuccess(response));
    } catch (e) {
      yield put(getJourneyStepsFail({ checkGroup: action.payload.checkGroup, error: e }));
    } finally {
      delete inFlightStepRequests[action.payload.checkGroup];
    }
  });
}
