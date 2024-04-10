/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityCsvUploadResponse } from '../../../../common/entity_analytics/asset_criticality/types';
import type { RowValidationErrors } from './validations';

export interface ReducerState {
  fileError?: string;
  isLoading: boolean;
  step: number;
  fileUploadResponse?: AssetCriticalityCsvUploadResponse;
  fileUploadError?: string;
  fileName?: string;
  invalidLinesAsText?: string;
  validLinesAsText?: string;
  validLinesCount?: number;
  invalidLinesCount?: number;
  invalidLinesErrors?: RowValidationErrors[];
}

export type ReducerAction =
  | { type: 'loadingFile'; payload: { fileName: string } }
  | { type: 'resetState' }
  | {
      type: 'fileValidated';
      payload: {
        fileName: string;
        invalidLinesAsText: string;
        validLinesAsText: string;
        validLinesCount: number;
        invalidLinesErrors: RowValidationErrors[];
        invalidLinesCount: number;
      };
    }
  | { type: 'fileError'; payload: { message: string } }
  | { type: 'uploadingFile' }
  | {
      type: 'fileUploaded';
      payload: { response?: AssetCriticalityCsvUploadResponse; errorMessage?: string };
    };

const initialState = {
  isLoading: false,
  step: 1,
};

export const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'resetState':
      return initialState;

    case 'loadingFile':
      return {
        isLoading: true,
        step: 1,
        fileName: action.payload.fileName,
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
        fileUploadResponse: action.payload.response,
        fileUploadError: action.payload.errorMessage,
        isLoading: false,
        step: 3,
      };

    default:
      return state;
  }
};
