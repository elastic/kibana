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
  | { action: 'updateFile'; payload: Partial<UpdatableFileAttributes> };

export function createDefaultFileAttributes(): Pick<
  FileSavedObjectAttributes,
  'created' | 'Updated' | 'Status'
> {
  const dateString = new Date().toISOString();
  return {
    created: dateString,
    Updated: dateString,
    Status: 'AWAITING_UPLOAD',
  };
}

export function fileAttributesReducer(
  state: FileSavedObjectAttributes,
  { action, payload }: Action
): FileSavedObjectAttributes {
  switch (action) {
    case 'delete':
      return { ...state, Status: 'DELETED' };
    case 'uploading':
      return { ...state, Status: 'UPLOADING' };
    case 'uploaded':
      return { ...state, ...payload, Status: 'READY' };
    case 'uploadError':
      return { ...state, Status: 'UPLOAD_ERROR' };
    case 'updateFile':
      const d = new Date();
      return {
        ...state,
        name: payload.name ?? state.name,
        Alt: payload.alt ?? state.Alt,
        Meta: payload.meta ?? state.Meta,
        Updated: d.toISOString(),
      };
    default:
      return state;
  }
}
