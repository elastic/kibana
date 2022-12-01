/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelUploadApiAction, API_ACTION_NAME } from './types';

interface StreamState {
  type: string;
  progress?: number;
  errors?: string[];
}

export const initialState: StreamState = {
  type: '',
};

export function streamReducer(
  state: StreamState,
  action: ModelUploadApiAction | ModelUploadApiAction[]
): StreamState {
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.GET_CONFIG:
    case API_ACTION_NAME.GET_VOCABULARY:
    case API_ACTION_NAME.PUT_CONFIG:
    case API_ACTION_NAME.PUT_VOCABULARY:
    case API_ACTION_NAME.COMPLETE:
      return { ...state, type: action.type };

    case API_ACTION_NAME.PUT_DEFINITION_PART:
      return { ...state, type: action.type, progress: action.payload.progress };

    default:
      return state;
  }
}
