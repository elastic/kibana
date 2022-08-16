/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { FileJSON, UpdatableFileMetadata } from '../../common';

export type Action =
  | {
      action: 'delete';
      payload?: undefined;
    }
  | {
      action: 'uploading';
      payload?: undefined;
    }
  | { action: 'uploaded'; payload: { size: number } }
  | { action: 'uploadError'; payload?: undefined }
  | { action: 'updateFile'; payload: Partial<UpdatableFileMetadata> };

export function fileAttributesReducer(state: FileJSON, { action, payload }: Action): FileJSON {
  switch (action) {
    case 'delete':
      return { ...state, status: 'DELETED' };
    case 'uploading':
      return {
        ...state,
        status: 'UPLOADING',
        updated: moment().toISOString(),
      };
    case 'uploaded':
      return {
        ...state,
        ...payload,
        status: 'READY',
        updated: moment().toISOString(),
      };
    case 'uploadError':
      return {
        ...state,
        status: 'UPLOAD_ERROR',
        updated: moment().toISOString(),
      };
    case 'updateFile':
      return {
        ...state,
        name: payload.name ?? state.name,
        alt: payload.alt ?? state.alt,
        meta: payload.meta ?? state.meta,
        updated: moment().toISOString(),
      };
    default:
      return state;
  }
}
