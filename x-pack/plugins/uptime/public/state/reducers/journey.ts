/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { Ping } from '../../../common/runtime_types';
import {
  FetchJourneyStepsParams,
  GetJourneyFailPayload,
  getJourneySteps,
  getJourneyStepsFail,
  getJourneyStepsSuccess,
  GetJourneySuccessPayload,
  getStepScreenshotSuccess,
  GetStepScreenshotSuccessPayload,
} from '../actions/journey';

export interface JourneyState {
  checkGroup: string;
  steps: Ping[];
  loading: boolean;
  screenshot?: string;
  error?: Error;
}

export interface JourneyStepsState {
  journeys: JourneyState[];
}

const initialState: JourneyStepsState = {
  journeys: [],
};

type Payload = FetchJourneyStepsParams &
  GetJourneySuccessPayload &
  GetJourneyFailPayload &
  GetStepScreenshotSuccessPayload;

function loadJourney(state: JourneyStepsState, checkGroup: string) {
  const journeyToLoad: JourneyState | undefined = state.journeys.find(
    (j) => j.checkGroup === checkGroup
  );
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

function updateJourneyError(state: JourneyStepsState, action: Action<GetJourneyFailPayload>) {
  const journeyToUpdate: JourneyState | undefined = state.journeys.find(
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

export const journeyReducer = handleActions<JourneyStepsState, Payload>(
  {
    [String(getJourneySteps)]: (
      state: JourneyStepsState,
      action: Action<FetchJourneyStepsParams>
    ) => ({
      journeys: [
        ...state.journeys.filter(({ checkGroup }) => checkGroup !== action.payload.checkGroup),
        loadJourney(state, action.payload.checkGroup),
      ],
    }),

    [String(getJourneyStepsSuccess)]: (
      state: JourneyStepsState,
      action: Action<GetJourneySuccessPayload>
    ) => ({
      journeys: [
        ...state.journeys.filter((j) => j.checkGroup !== action.payload.checkGroup),
        { checkGroup: action.payload.checkGroup, steps: action.payload.steps, loading: false },
      ],
    }),

    [String(getJourneyStepsFail)]: (
      state: JourneyStepsState,
      action: Action<GetJourneyFailPayload>
    ) => ({
      journeys: [
        ...state.journeys.filter((j) => j.checkGroup !== action.payload.checkGroup),
        updateJourneyError(state, action),
      ],
    }),

    [String(getStepScreenshotSuccess)]: (
      state: JourneyStepsState,
      action: Action<GetStepScreenshotSuccessPayload>
    ) => ({
      journeys: state.journeys.map((j) => {
        if (j.checkGroup !== action.payload.checkGroup) return j;
        const step = j.steps.find((s) => s.synthetics.step.index === action.payload.stepIndex);
        step.screenshot = action.payload.screenshot;
        return j;
      }),
    }),
  },
  initialState
);
