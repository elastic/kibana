/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { Ping } from '../../../common/runtime_types';

export interface FetchJourneyStepsParams {
  checkGroup: string;
}

export interface GetJourneySuccessPayload {
  checkGroup: string;
  steps: Ping[];
}

export interface GetJourneyFailPayload {
  checkGroup: string;
  error: Error;
}

export const getJourneySteps = createAction<FetchJourneyStepsParams>('GET_JOURNEY_STEPS');
export const getJourneyStepsSuccess = createAction<GetJourneySuccessPayload>(
  'GET_JOURNEY_STEPS_SUCCESS'
);
export const getJourneyStepsFail = createAction<GetJourneyFailPayload>('GET_JOURNEY_STEPS_FAIL');

export interface FetchStepScreenshot {
  checkGroup: string;
  stepIndex: number;
}

export interface GetStepScreenshotSuccessPayload {
  checkGroup: string;
  stepIndex: number;
  screenshot: string;
}

export interface GetStepScreenshotFailPayload {
  checkGroup: string;
  stepIndex: number;
  error: Error;
}

export const getStepScreenshot = createAction<FetchStepScreenshot>('FETCH_STEP_SCREENSHOT');
export const getStepScreenshotSuccess = createAction<GetStepScreenshotSuccessPayload>(
  'GET_STEP_SCREENSHOT_SUCCESS'
);
export const getStepScreenshotFail = createAction<GetStepScreenshotFailPayload>(
  'GET_STEP_SCREENSHOT_FAIL_PAYLOAD'
);
