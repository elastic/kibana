/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_ENDPOINT = {
  UPLOAD: '/api/ml/trained_models/hugging_face_import',
} as const;

export interface ModelUpload {
  endpoint: typeof API_ENDPOINT.UPLOAD;
  reducer: typeof streamReducer;
  body: any;
  actions: ModelUploadApiAction;
}

interface StreamState {
  progress: number;
  messages: string[];
  errors: string[];
}

export const initialState: StreamState = {
  progress: 0,
  messages: [],
  errors: [],
};

export function streamReducer(
  state: StreamState,
  action: ModelUploadApiAction | ModelUploadApiAction[]
): StreamState {
  // debugger;
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.ADD_MESSAGES:
      return { ...state, messages: [...state.messages, ...action.payload.messages] };
    case API_ACTION_NAME.PROGRESS:
      return { ...state, progress: action.payload.progress };

    case API_ACTION_NAME.UPDATE_LOADING_STATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export const API_ACTION_NAME = {
  ADD_MESSAGES: 'add_messages',
  PROGRESS: 'progress',
  ADD_ERROR: 'add_error',
  RESET: 'reset',
  UPDATE_LOADING_STATE: 'update_loading_state',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionAddMessages {
  type: typeof API_ACTION_NAME.ADD_MESSAGES;
  payload: { messages: string[] };
}

export function addChangePointsAction(
  payload: ApiActionAddMessages['payload']
): ApiActionAddMessages {
  return {
    type: API_ACTION_NAME.ADD_MESSAGES,
    payload,
  };
}

interface ApiActionUploadProgress {
  type: typeof API_ACTION_NAME.PROGRESS;
  payload: { progress: number };
}

export function uploadProgressAction(
  payload: ApiActionUploadProgress['payload']
): ApiActionUploadProgress {
  return {
    type: API_ACTION_NAME.PROGRESS,
    payload,
  };
}

interface ApiActionUpdateLoadingState {
  type: typeof API_ACTION_NAME.UPDATE_LOADING_STATE;
  payload: {
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
  };
}

export function updateLoadingStateAction(
  payload: ApiActionUpdateLoadingState['payload']
): ApiActionUpdateLoadingState {
  return {
    type: API_ACTION_NAME.UPDATE_LOADING_STATE,
    payload,
  };
}

export type ModelUploadApiAction =
  | ApiActionAddMessages
  | ApiActionUpdateLoadingState
  | ApiActionUploadProgress;
