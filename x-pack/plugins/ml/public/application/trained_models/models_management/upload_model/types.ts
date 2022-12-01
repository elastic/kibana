/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPORT_API_ACTION_NAME } from '../../../../../common/constants/trained_models';
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

export type ApiActionName = typeof IMPORT_API_ACTION_NAME[keyof typeof IMPORT_API_ACTION_NAME];

interface ApiActionGetConfig {
  type: typeof IMPORT_API_ACTION_NAME.GET_CONFIG;
}
interface ApiActionGetVocabulary {
  type: typeof IMPORT_API_ACTION_NAME.GET_VOCABULARY;
}
interface ApiActionPutConfig {
  type: typeof IMPORT_API_ACTION_NAME.PUT_CONFIG;
}
interface ApiActionPutVocabulary {
  type: typeof IMPORT_API_ACTION_NAME.PUT_VOCABULARY;
}
interface ApiActionPutDefinitionPart {
  type: typeof IMPORT_API_ACTION_NAME.PUT_DEFINITION_PART;
  payload: { progress: number };
}
interface ApiActionComplete {
  type: typeof IMPORT_API_ACTION_NAME.COMPLETE;
}
interface ApiActionError {
  type: typeof IMPORT_API_ACTION_NAME.ERROR;
  error: string;
}

export type ModelUploadApiAction =
  | ApiActionGetConfig
  | ApiActionGetVocabulary
  | ApiActionPutConfig
  | ApiActionPutVocabulary
  | ApiActionPutDefinitionPart
  | ApiActionComplete
  | ApiActionError;
