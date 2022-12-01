/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamReducer } from './utils';

export const API_ENDPOINT = {
  UPLOAD: '/api/ml/trained_models/hugging_face_import',
} as const;

export interface ModelUpload {
  endpoint: typeof API_ENDPOINT.UPLOAD;
  reducer: typeof streamReducer;
  body: any;
  actions: ModelUploadApiAction;
}

export const API_ACTION_NAME = {
  GET_CONFIG: 'get_config',
  GET_VOCABULARY: 'get_vocabulary',
  PUT_CONFIG: 'put_config',
  PUT_VOCABULARY: 'put_vocabulary',
  PUT_DEFINITION_PART: 'put_definition_part',
  COMPLETE: 'complete',
  RESET: 'reset',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionGetConfig {
  type: typeof API_ACTION_NAME.GET_CONFIG;
}
interface ApiActionGetVocabulary {
  type: typeof API_ACTION_NAME.GET_VOCABULARY;
}
interface ApiActionPutConfig {
  type: typeof API_ACTION_NAME.PUT_CONFIG;
}
interface ApiActionPutVocabulary {
  type: typeof API_ACTION_NAME.PUT_VOCABULARY;
}
interface ApiActionPutDefinitionPart {
  type: typeof API_ACTION_NAME.PUT_DEFINITION_PART;
  payload: { progress: number };
}
interface ApiActionComplete {
  type: typeof API_ACTION_NAME.COMPLETE;
}

export type ModelUploadApiAction =
  | ApiActionGetConfig
  | ApiActionGetVocabulary
  | ApiActionPutConfig
  | ApiActionPutVocabulary
  | ApiActionPutDefinitionPart
  | ApiActionComplete;
