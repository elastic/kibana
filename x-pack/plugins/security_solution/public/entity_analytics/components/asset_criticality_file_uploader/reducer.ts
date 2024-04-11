/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityCsvUploadResponse } from '../../../../common/entity_analytics/asset_criticality/types';
import type { RowValidationErrors } from './validations';

export interface FilePickerState {
  isLoading: boolean;
  step: FileUploaderSteps.FILE_PICKER;
  fileError?: string;
  fileName?: string;
}

export interface ValidationStepState {
  isLoading: boolean;
  step: FileUploaderSteps.VALIDATION;
  fileError?: string;
  fileName: string;
  fileSize: number;
  invalidLinesAsText: string;
  validLinesAsText: string;
  validLinesCount: number;
  invalidLinesCount: number;
  invalidLinesErrors: RowValidationErrors[];
}

export interface ResultStepState {
  step: FileUploaderSteps.RESULT;
  fileUploadResponse?: AssetCriticalityCsvUploadResponse;
  fileUploadError?: string;
  validLinesAsText: string;
}

export type ReducerState = FilePickerState | ValidationStepState | ResultStepState;

export enum FileUploaderSteps {
  FILE_PICKER = 1,
  VALIDATION = 2,
  RESULT = 3,
}

export type ReducerAction =
  | { type: 'loadingFile'; payload: { fileName: string } }
  | { type: 'resetState' }
  | {
      type: 'fileValidated';
      payload: {
        fileName: string;
        fileSize: number;
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

export const INITIAL_STATE: FilePickerState = {
  isLoading: false,
  step: FileUploaderSteps.FILE_PICKER,
};

export const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'resetState':
      return INITIAL_STATE;

    case 'loadingFile':
      if (isFilePickerStep(state)) {
        return {
          ...state,
          isLoading: true,
          fileName: action.payload.fileName,
        };
      }
      break;

    case 'fileError':
      return {
        isLoading: false,
        step: FileUploaderSteps.FILE_PICKER,
        fileError: action.payload.message,
      };

    case 'fileValidated':
      return {
        isLoading: false,
        step: FileUploaderSteps.VALIDATION,
        ...action.payload,
      };

    case 'uploadingFile':
      if (isValidationStep(state)) {
        return {
          ...state,
          isLoading: true,
        };
      }
      break;

    case 'fileUploaded':
      if (isValidationStep(state)) {
        return {
          fileUploadResponse: action.payload.response,
          fileUploadError: action.payload.errorMessage,
          validLinesAsText: state.validLinesAsText,
          step: FileUploaderSteps.RESULT,
        };
      }
      break;
  }
  return state;
};

export const isFilePickerStep = (state: ReducerState): state is FilePickerState =>
  state.step === FileUploaderSteps.FILE_PICKER;

export const isValidationStep = (state: ReducerState): state is ValidationStepState =>
  state.step === FileUploaderSteps.VALIDATION;

export const isResultStep = (state: ReducerState): state is ResultStepState =>
  state.step === FileUploaderSteps.RESULT;
