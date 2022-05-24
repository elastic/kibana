/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_ACTION_NAME, AiopsExplainLogRateSpikesApiAction } from './explain_log_rate_spikes';

interface StreamState {
  ccsWarning: boolean;
  loaded: number;
  loadingState: string;
}

export const initialState: StreamState = {
  ccsWarning: false,
  loaded: 0,
  loadingState: '',
};

export function streamReducer(
  state: StreamState,
  action: AiopsExplainLogRateSpikesApiAction | AiopsExplainLogRateSpikesApiAction[]
): StreamState {
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.INITIALIZE:
      return action.payload;
    default:
      return state;
  }
}
