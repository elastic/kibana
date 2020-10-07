/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { SyntheticsJourneyApiResponse } from '../../../common/runtime_types';

export interface FetchJourneyStepsParams {
  checkGroup: string;
}

export interface GetJourneyFailPayload {
  checkGroup: string;
  error: Error;
}

export const getJourneySteps = createAction<FetchJourneyStepsParams>('GET_JOURNEY_STEPS');
export const getJourneyStepsSuccess = createAction<SyntheticsJourneyApiResponse>(
  'GET_JOURNEY_STEPS_SUCCESS'
);
export const getJourneyStepsFail = createAction<GetJourneyFailPayload>('GET_JOURNEY_STEPS_FAIL');
export const pruneJourneyState = createAction<string[]>('PRUNE_JOURNEY_STATE');
