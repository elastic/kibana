/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { FileMetadata, UpdatableFileMetadata } from '../../common';

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

export function createDefaultFileAttributes(): Pick<
  FileMetadata,
  'created' | 'Updated' | 'Status'
> {
  const dateString = new Date().toISOString();
  return {
    created: dateString,
    Status: 'AWAITING_UPLOAD',
    Updated: dateString,
  };
}

export function fileAttributesReducer(
  state: FileMetadata,
  { action, payload }: Action
): FileMetadata {
  switch (action) {
    case 'delete':
      return { ...state, Status: 'DELETED' };
    case 'uploading':
      return {
        ...state,
        Status: 'UPLOADING',
        Updated: moment().toISOString(),
      };
    case 'uploaded':
      return {
        ...state,
        ...payload,
        Status: 'READY',
        Updated: moment().toISOString(),
      };
    case 'uploadError':
      return {
        ...state,
        Status: 'UPLOAD_ERROR',
        Updated: moment().toISOString(),
      };
    case 'updateFile':
      return {
        ...state,
        name: payload.name ?? state.name,
        Alt: payload.alt ?? state.Alt,
        Meta: payload.meta ?? state.Meta,
        Updated: moment().toISOString(),
      };
    default:
      return state;
  }
}
