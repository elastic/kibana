/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityCsvUploadResponse } from '../../../../common/api/entity_analytics';
import type { ReducerAction, ReducerState, ValidationStepState } from './reducer';
import { reducer } from './reducer';
import { FileUploaderSteps } from './types';

describe('reducer', () => {
  const initialState: ReducerState = {
    isLoading: false,
    step: FileUploaderSteps.FILE_PICKER,
  };

  const validatedFile = {
    name: 'test.csv',
    size: 100,
    validLines: {
      text: 'valid lines',
      count: 10,
    },
    invalidLines: {
      text: 'invalid lines',
      count: 0,
      errors: [],
    },
  };

  it('should handle "uploadingFile" action', () => {
    const action: ReducerAction = { type: 'uploadingFile' };
    const state: ValidationStepState = {
      validatedFile,
      isLoading: false,
      step: FileUploaderSteps.VALIDATION,
    };
    const nextState = reducer(state, action) as ValidationStepState;

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
    const state: ValidationStepState = {
      validatedFile,
      isLoading: true,
      step: FileUploaderSteps.VALIDATION,
    };

    const action: ReducerAction = { type: 'fileUploaded', payload: { response } };
    const nextState = reducer(state, action);

    expect(nextState).toEqual({
      step: FileUploaderSteps.RESULT,
      fileUploadResponse: response,
      fileUploadError: undefined,
      validLinesAsText: validatedFile.validLines.text,
    });
  });

  it('should handle "fileUploaded" action with errorMessage', () => {
    const errorMessage = 'File upload failed';
    const state: ValidationStepState = {
      validatedFile,
      isLoading: true,
      step: FileUploaderSteps.VALIDATION,
    };

    const action: ReducerAction = { type: 'fileUploaded', payload: { errorMessage } };
    const nextState = reducer(state, action);

    expect(nextState).toEqual({
      step: FileUploaderSteps.RESULT,
      fileUploadResponse: undefined,
      fileUploadError: errorMessage,
      validLinesAsText: validatedFile.validLines.text,
    });
  });

  it('should handle "loadingFile" action', () => {
    const fileName = 'file.csv';
    const action: ReducerAction = { type: 'loadingFile', payload: { fileName } };
    const nextState = reducer(initialState, action);

    expect(nextState).toEqual({
      isLoading: true,
      step: FileUploaderSteps.FILE_PICKER,
      fileName,
    });
  });

  it('should handle "fileValidated" action', () => {
    const action: ReducerAction = {
      type: 'fileValidated',
      payload: { validatedFile },
    };
    const nextState = reducer({ ...initialState, isLoading: true }, action);

    expect(nextState).toEqual({
      isLoading: false,
      step: FileUploaderSteps.VALIDATION,
      validatedFile,
    });
  });

  it('should handle "fileError" action', () => {
    const message = 'File error';
    const action: ReducerAction = { type: 'fileError', payload: { message } };
    const nextState = reducer(
      {
        step: 9999,
        isLoading: true,
        validatedFile: {
          name: '',
          size: 0,
          validLines: { text: '', count: 0 },
          invalidLines: { text: '', count: 0, errors: [] },
        },
      },
      action
    );

    expect(nextState).toEqual({
      isLoading: false,
      step: FileUploaderSteps.FILE_PICKER,
      fileError: message,
    });
  });

  it('should handle "resetState" action', () => {
    const action: ReducerAction = { type: 'resetState' };
    const nextState = reducer({ step: 9999, isLoading: true, validatedFile }, action);

    expect(nextState).toEqual(initialState);
  });
});
