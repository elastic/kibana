/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReducerState, ReducerAction } from './reducer';
import { reducer } from './reducer';

describe('reducer', () => {
  let initialState: ReducerState;

  beforeEach(() => {
    initialState = {
      isLoading: false,
      step: 1,
    };
  });

  it('should handle uploadingFile action', () => {
    const action: ReducerAction = { type: 'uploadingFile' };
    const nextState = reducer(initialState, action);

    expect(nextState.isLoading).toBe(true);
    expect(nextState.step).toBe(1);
  });

  it('should handle fileUploaded action with response', () => {
    const response = {
      /* mock response object */
    };
    const action: ReducerAction = { type: 'fileUploaded', payload: { response } };
    const nextState = reducer(initialState, action);

    expect(nextState.isLoading).toBe(false);
    expect(nextState.step).toBe(1);
    expect(nextState.fileUploadResponse).toBe(response);
    expect(nextState.fileUploadError).toBeUndefined();
  });

  it('should handle fileUploaded action with errorMessage', () => {
    const errorMessage = 'File upload failed';
    const action: ReducerAction = { type: 'fileUploaded', payload: { errorMessage } };
    const nextState = reducer(initialState, action);

    expect(nextState.isLoading).toBe(false);
    expect(nextState.step).toBe(1);
    expect(nextState.fileUploadResponse).toBeUndefined();
    expect(nextState.fileUploadError).toBe(errorMessage);
  });

  // Add more test cases for other actions...
});
