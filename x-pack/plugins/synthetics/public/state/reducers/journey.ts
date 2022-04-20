/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions, Action } from 'redux-actions';
import { JourneyStep, SyntheticsJourneyApiResponse } from '../../../common/runtime_types';
import { pruneJourneyState } from '../actions/journey';
import {
  FetchJourneyStepsParams,
  GetJourneyFailPayload,
  getJourneySteps,
  getJourneyStepsFail,
  getJourneyStepsSuccess,
} from '../actions/journey';

export interface JourneyState {
  checkGroup: string;
  steps: JourneyStep[];
  details?: SyntheticsJourneyApiResponse['details'];
  loading: boolean;
  error?: Error;
}

export interface JourneyKVP {
  [checkGroup: string]: JourneyState;
}

const initialState: JourneyKVP = {};

type Payload = FetchJourneyStepsParams &
  SyntheticsJourneyApiResponse &
  GetJourneyFailPayload &
  string[];

export const journeyReducer = handleActions<JourneyKVP, Payload>(
  {
    [String(getJourneySteps)]: (
      state: JourneyKVP,
      { payload: { checkGroup } }: Action<FetchJourneyStepsParams>
    ) => ({
      ...state,
      // add an empty entry while fetching the check group,
      // or update the previously-loaded entry to a new loading state
      [checkGroup]: state[checkGroup]
        ? {
            ...state[checkGroup],
            loading: true,
          }
        : {
            checkGroup,
            steps: [],
            loading: true,
          },
    }),

    [String(getJourneyStepsSuccess)]: (
      state: JourneyKVP,
      { payload: { checkGroup, steps, details } }: Action<SyntheticsJourneyApiResponse>
    ) => ({
      ...state,
      [checkGroup]: {
        loading: false,
        checkGroup,
        steps,
        details,
      },
    }),

    [String(getJourneyStepsFail)]: (
      state: JourneyKVP,
      { payload: { checkGroup, error } }: Action<GetJourneyFailPayload>
    ) => ({
      ...state,
      [checkGroup]: state[checkGroup]
        ? {
            ...state[checkGroup],
            loading: false,
            error,
          }
        : {
            checkGroup,
            loading: false,
            steps: [],
            error,
          },
    }),

    [String(pruneJourneyState)]: (state: JourneyKVP, action: Action<string[]>) =>
      action.payload.reduce(
        (prev, cur) => ({
          ...prev,
          [cur]: state[cur],
        }),
        {}
      ),
  },
  initialState
);
