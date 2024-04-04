/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityCsvUploadResponse } from '../../../../common/entity_analytics/asset_criticality/types';

interface ReducerState {
  fileError?: string;
  //   parserError?: Papa.ParseError; // Unexpected error that happens when parsing a file
  //   unsupportedFileTypeError?: string;
  //   fileValidationError?: string;
  isLoading: boolean;
  // file?: File;
  // validLines?: string[][];
  // invalidLines?: string[][];
  step: number;
  fileUploadResponse?: AssetCriticalityCsvUploadResponse;

  fileName?: string;
  invalidLinesAsText?: string;
  validLinesAsText?: string;
  validLinesCount?: number;
  invalidLinesCount?: number;
}

type ReducerAction =
  | { type: 'uploadingFile' }
  | { type: 'fileUploaded'; payload: AssetCriticalityCsvUploadResponse }
  | { type: 'goToStep'; payload: { step: number } }
  | { type: 'loadingFile'; payload: { fileName: string } }
  | {
      type: 'fileValidated';
      payload: {
        fileName: string;
        invalidLinesAsText: string;
        validLinesAsText: string;
        validLinesCount: number;
        invalidLinesCount: number;
      };
    }
  | { type: 'fileError'; payload: { message: string; file: File } };

export const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'goToStep':
      if (action.payload.step > state.step || state.step === 3) {
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

      if (action.payload.step === 3) {
        return {
          isLoading: false,
          step: 3,
        };
      }

      return state;
    case 'loadingFile':
      return {
        isLoading: true,
        fileName: action.payload.fileName,
        step: 1,
      };

    case 'fileValidated':
      return {
        isLoading: false,
        step: 2,
        ...action.payload,
      };

    case 'fileError':
      return {
        isLoading: false,
        step: 1,
        fileError: action.payload.message,
      };

    case 'uploadingFile':
      return {
        ...state,
        isLoading: true,
      };

    case 'fileUploaded':
      return {
        ...state,
        fileUploadResponse: action.payload,
        isLoading: false,
        step: 3,
      };

    default:
      return state;
  }
};
