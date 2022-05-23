/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileSavedObjectAttributes, UpdatableFileAttributes } from '../../common';

export type Action =
  | {
      action: 'delete';
      payload?: undefined;
    }
  | {
      action: 'uploading';
      payload?: undefined;
    }
  | { action: 'uploaded'; payload: { content_ref: string; size: number } }
  | { action: 'uploadError'; payload?: undefined }
  | { action: 'updateFile'; payload: UpdatableFileAttributes };

export function createDefaultFileAttributes(): Pick<
  FileSavedObjectAttributes,
  'created_at' | 'updated_at' | 'status'
> {
  const dateString = new Date().toISOString();
  return {
    created_at: dateString,
    updated_at: dateString,
    status: 'AWAITING_UPLOAD',
  };
}

export function fileAttributesReducer(
  state: FileSavedObjectAttributes,
  { action, payload }: Action
): FileSavedObjectAttributes {
  switch (action) {
    case 'delete':
      return { ...state, status: 'DELETED' };
    case 'uploading':
      return { ...state, content_ref: undefined, status: 'UPLOADING' };
    case 'uploaded':
      return { ...state, ...payload, status: 'READY' };
    case 'uploadError':
      return { ...state, status: 'UPLOAD_ERROR', content_ref: undefined };
    case 'updateFile':
      const d = new Date();
      return {
        ...state,
        ...payload,
        updated_at: d.toISOString(),
      };
    default:
      return state;
  }
}
