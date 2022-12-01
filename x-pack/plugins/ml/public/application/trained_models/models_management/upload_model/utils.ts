/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPORT_API_ACTION_NAME } from '../../../../../common/constants/trained_models';
import { ModelUploadApiAction } from './types';
import type { HuggingFaceTrainedModel } from '../../../../../common/types/trained_models';

const HUGGING_FACE_URL = 'https://huggingface.co/';
interface StreamState {
  type: string;
  progress?: number;
  error?: string;
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
    case IMPORT_API_ACTION_NAME.GET_CONFIG:
    case IMPORT_API_ACTION_NAME.GET_VOCABULARY:
    case IMPORT_API_ACTION_NAME.PUT_CONFIG:
    case IMPORT_API_ACTION_NAME.PUT_VOCABULARY:
    case IMPORT_API_ACTION_NAME.COMPLETE:
      return { ...state, type: action.type };

    case IMPORT_API_ACTION_NAME.PUT_DEFINITION_PART:
      return { ...state, type: action.type, progress: action.payload.progress };
    case IMPORT_API_ACTION_NAME.ERROR:
      return { ...state, type: action.type, error: action.error };

    default:
      return state;
  }
}

export function getHuggingFaceUrl(model: HuggingFaceTrainedModel) {
  const id = model.source.metadata.repo_id;
  return { url: `${HUGGING_FACE_URL}${id}`, text: id };
}
