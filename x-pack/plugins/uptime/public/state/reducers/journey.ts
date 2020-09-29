/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { Ping, SyntheticsJourneyApiResponse } from '../../../common/runtime_types';
import {
  FetchJourneyStepsParams,
  FetchStepScreenshot,
  GetJourneyFailPayload,
  getJourneySteps,
  getJourneyStepsFail,
  getJourneyStepsSuccess,
  getStepScreenshot,
  getStepScreenshotFail,
  GetStepScreenshotFailPayload,
  getStepScreenshotSuccess,
  GetStepScreenshotSuccessPayload,
} from '../actions/journey';

export interface JourneyState {
  checkGroup: string;
  steps: Ping[];
  loading: boolean;
  error?: Error;
}

const initialState: JourneyState[] = [];

type Payload = FetchJourneyStepsParams &
  SyntheticsJourneyApiResponse &
  GetJourneyFailPayload &
  GetStepScreenshotSuccessPayload;

function loadJourney(state: JourneyState[], checkGroup: string) {
  const journeyToLoad: JourneyState | undefined = state.find((j) => j.checkGroup === checkGroup);
  if (journeyToLoad) {
    return {
      ...journeyToLoad,
      loading: true,
    };
  }
  return {
    checkGroup,
    steps: [],
    loading: true,
  };
}

function updateJourneyError(state: JourneyState[], action: Action<GetJourneyFailPayload>) {
  const journeyToUpdate: JourneyState | undefined = state.find(
    (j) => j.checkGroup === action.payload.checkGroup
  );
  if (journeyToUpdate) {
    return {
      ...journeyToUpdate,
      loading: false,
      error: action.payload.error,
    };
  }
  return {
    checkGroup: action.payload.checkGroup,
    loading: false,
    steps: [],
    error: action.payload.error,
  };
}

export const journeyReducer = handleActions<JourneyState[], Payload>(
  {
    [String(getJourneySteps)]: (state: JourneyState[], action: Action<FetchJourneyStepsParams>) => [
      ...state.filter(({ checkGroup }) => checkGroup !== action.payload.checkGroup),
      loadJourney(state, action.payload.checkGroup),
    ],

    [String(getJourneyStepsSuccess)]: (
      state: JourneyState[],
      action: Action<SyntheticsJourneyApiResponse>
    ) => [
      ...state.filter((j) => j.checkGroup !== action.payload.checkGroup),
      { checkGroup: action.payload.checkGroup, steps: action.payload.steps, loading: false },
    ],

    [String(getJourneyStepsFail)]: (
      state: JourneyState[],
      action: Action<GetJourneyFailPayload>
    ) => [
      ...state.filter((j) => j.checkGroup !== action.payload.checkGroup),
      updateJourneyError(state, action),
    ],

    [String(getStepScreenshot)]: (state: JourneyState[], action: Action<FetchStepScreenshot>) =>
      state.map((j) => {
        if (j.checkGroup !== action.payload.checkGroup) return j;
        const step = j.steps.find((s) => s.synthetics.step.index === action.payload.stepIndex);
        step.synthetics.screenshotLoading = true;
        return j;
      }),

    [String(getStepScreenshotSuccess)]: (
      state: JourneyState[],
      action: Action<GetStepScreenshotSuccessPayload>
    ) =>
      state.map((j) => {
        if (j.checkGroup !== action.payload.checkGroup) return j;
        const step = j.steps.find((s) => s.synthetics.step.index === action.payload.stepIndex);
        step.synthetics.blob = action.payload.screenshot;
        step.synthetics.screenshotLoading = false;
        return j;
      }),

    [String(getStepScreenshotFail)]: (
      state: JourneyState[],
      action: Action<GetStepScreenshotFailPayload>
    ) =>
      state.map((j) => {
        if (j.checkGroup !== action.payload.checkGroup) return j;
        const step = j.steps.find((s) => s.synthetics.step.index === action.payload.stepIndex);
        step.synthetics.screenshotLoading = false;
        // TODO: error handle
        return j;
      }),
  },
  initialState
);
