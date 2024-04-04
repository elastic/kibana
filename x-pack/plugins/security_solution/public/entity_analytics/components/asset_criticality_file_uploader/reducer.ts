/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ReducerState {
  parserError?: Papa.ParseError; // Unexpected error that happens when parsing a file
  unsupportedFileTypeError?: string;
  fileValidationError?: string;
  isLoading: boolean;
  file?: File;
  validLines?: string[][];
  invalidLines?: string[][];
  step: number;
}

type ReducerAction =
  | { type: 'goToStep'; payload: { step: number } }
  | { type: 'loadingFile'; payload: File }
  | {
      type: 'fileValidated';
      payload: { file?: File; invalidLines: string[][]; validLines: string[][] };
    }
  | { type: 'parserError'; payload: Papa.ParseError }
  | { type: 'fileValidationError'; payload: { error: string } }
  | { type: 'unsupportedFileType'; payload: { error: string; file: File } };

export const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'goToStep':
      if (action.payload.step > state.step) {
        return state;
      }

      if (action.payload.step === 1) {
        return {
          ...action.payload,
          isLoading: false,
          step: 1,
        };
      }

      if (action.payload.step === 2) {
        return {
          isLoading: false,
          step: 2,
        };
      }

      return state;
    case 'loadingFile':
      return {
        isLoading: true,
        file: action.payload,
        step: 1,
      };

    case 'fileValidated':
      return {
        isLoading: false,
        step: 2,
        ...action.payload,
      };

    case 'parserError':
      return {
        isLoading: false,
        step: 1,
        parserError: action.payload,
      };

    case 'unsupportedFileType':
      return {
        isLoading: false,
        step: 1,
        file: action.payload.file,
        unsupportedFileTypeError: action.payload.error,
      };

    case 'fileValidationError':
      return {
        isLoading: false,
        step: 1,
        fileValidationError: action.payload.error,
      };

    default:
      return state;
  }
};
