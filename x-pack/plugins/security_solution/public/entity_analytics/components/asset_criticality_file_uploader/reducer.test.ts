/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityCsvUploadResponse } from '../../../../common/api/entity_analytics';
import type { OnCompleteParams } from './hooks';
import type { ReducerAction, ReducerState } from './reducer';
import { reducer } from './reducer';

describe('reducer', () => {
  const initialState: ReducerState = {
    isLoading: false,
    step: 1,
  };

  const onCompleteParams: OnCompleteParams = {
    fileName: 'test.csv',
    validLinesAsText: 'valid lines',
    invalidLinesAsText: 'invalid lines',
    invalidLinesErrors: [],
    validLinesCount: 10,
    invalidLinesCount: 0,
  };

  it('should handle "uploadingFile" action', () => {
    const action: ReducerAction = { type: 'uploadingFile' };
    const nextState = reducer(initialState, action);

    expect(nextState.isLoading).toBe(true);
  });

  it('should handle "fileUploaded" action with response', () => {
    const response: AssetCriticalityCsvUploadResponse = {
      errors: [],
      stats: {
        total: 10,
        successful: 10,
        failed: 0,
      },
    };
    const action: ReducerAction = { type: 'fileUploaded', payload: { response } };
    const nextState = reducer({ ...initialState, isLoading: true }, action);

    expect(nextState).toEqual({
      isLoading: false,
      step: 3,
      fileUploadResponse: response,
      fileUploadError: undefined,
    });
  });

  it('should handle "fileUploaded" action with errorMessage', () => {
    const errorMessage = 'File upload failed';
    const action: ReducerAction = { type: 'fileUploaded', payload: { errorMessage } };
    const nextState = reducer({ ...initialState, isLoading: true }, action);

    expect(nextState).toEqual({
      isLoading: false,
      step: 3,
      fileUploadResponse: undefined,
      fileUploadError: errorMessage,
    });
  });

  it('should handle "loadingFile" action', () => {
    const fileName = 'file.csv';
    const action: ReducerAction = { type: 'loadingFile', payload: { fileName } };
    const nextState = reducer(initialState, action);

    expect(nextState).toEqual({
      isLoading: true,
      step: 1,
      fileName,
    });
  });

  it('should handle "fileValidated" action', () => {
    const action: ReducerAction = { type: 'fileValidated', payload: onCompleteParams };
    const nextState = reducer({ ...initialState, isLoading: true }, action);

    expect(nextState).toEqual({
      isLoading: false,
      step: 2,
      ...onCompleteParams,
    });
  });

  it('should handle "fileError" action', () => {
    const message = 'File error';
    const action: ReducerAction = { type: 'fileError', payload: { message } };
    const nextState = reducer({ step: 9999, isLoading: true }, action);

    expect(nextState).toEqual({
      isLoading: false,
      step: 1,
      fileError: message,
    });
  });

  it('should handle "resetState" action', () => {
    const action: ReducerAction = { type: 'resetState' };
    const nextState = reducer({ step: 9999, isLoading: true, ...onCompleteParams }, action);

    expect(nextState).toEqual(initialState);
  });
});
