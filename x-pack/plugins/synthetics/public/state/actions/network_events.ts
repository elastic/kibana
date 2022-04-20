/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { SyntheticsNetworkEventsApiResponse } from '../../../common/runtime_types';

export interface FetchNetworkEventsParams {
  checkGroup: string;
  stepIndex: number;
}

export interface FetchNetworkEventsFailPayload {
  checkGroup: string;
  stepIndex: number;
  error: Error;
}

export const getNetworkEvents = createAction<FetchNetworkEventsParams>('GET_NETWORK_EVENTS');
export const getNetworkEventsSuccess = createAction<
  Pick<FetchNetworkEventsParams, 'checkGroup' | 'stepIndex'> & SyntheticsNetworkEventsApiResponse
>('GET_NETWORK_EVENTS_SUCCESS');
export const getNetworkEventsFail =
  createAction<FetchNetworkEventsFailPayload>('GET_NETWORK_EVENTS_FAIL');
