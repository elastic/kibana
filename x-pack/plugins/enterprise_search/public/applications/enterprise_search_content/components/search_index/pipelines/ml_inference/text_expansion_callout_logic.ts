/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';
import {
  CreateTextExpansionModelApiLogic,
  CreateTextExpansionModelApiLogicActions,
  CreateTextExpansionModelResponse,
} from '../../../../api/ml_models/text_expansion/create_text_expansion_model_api_logic';
import {
  FetchTextExpansionModelApiLogic,
  FetchTextExpansionModelApiLogicActions,
  FetchTextExpansionModelResponse,
} from '../../../../api/ml_models/text_expansion/fetch_text_expansion_model_api_logic';

// export enum MlModelDeploymentState {
//   NotDeployed = '',
//   Downloading = 'downloading',
//   Downloaded = 'downloaded',
//   Starting = 'starting',
//   Started = 'started',
//   FullyAllocated = 'fully_allocated',
//   Error = 'error',
// }

// export interface MlModelDeploymentStatus {
//   deploymentState: MlModelDeploymentState;
//   modelId: string;
//   nodeAllocationCount: number;
//   startTime: number;
//   targetAllocationCount: number;
// }

// On page load: call Get API
// - If no model -> Deploy button
// - If model is downloading -> Start progress bar
// - If model is starting -> Progress bar to 90%
// - If model is fully allocated -> Deployed panel

// Deploy button -> on click:
//  - Disable
//  - Call Create API, wait for response
//  - Call Sync API, wait for response
//  - Start progress bar
//  - Begin polling for status

// Status polling
// - If model is starting -> Progress bar to 90%
// - If model is fully allocated -> Deployed panel

// Error handling
// - If any API call returns error -> Error panel

interface TextExpansionCalloutActions {
  createTextExpansionModel: CreateTextExpansionModelApiLogicActions['makeRequest'];
  createTextExpansionModelSuccess: CreateTextExpansionModelApiLogicActions['apiSuccess'];
  fetchTextExpansionModel: FetchTextExpansionModelApiLogicActions['makeRequest'];
  fetchTextExpansionModelSuccess: FetchTextExpansionModelApiLogicActions['apiSuccess'];
  textExpansionModel: FetchTextExpansionModelApiLogicActions['apiSuccess'];
  startPollingTextExpansionModel: () => void;
  stopPollingTextExpansionModel: () => void;
}

export interface TextExpansionCalloutValues {
  createdTextExpansionModel: CreateTextExpansionModelResponse | undefined;
  createTextExpansionModelStatus: Status;
  isCreateButtonDisabled: boolean;
  isModelDownloadInProgress: boolean;
  isModelDownloaded: boolean;
  textExpansionModel: FetchTextExpansionModelResponse | undefined;
}

export const TextExpansionCalloutLogic = kea<
  MakeLogicType<TextExpansionCalloutValues, TextExpansionCalloutActions>
>({
  actions: {
    startPollingTextExpansionModel: true,
    stopPollingTextExpansionModel: true,
  },
  connect: {
    actions: [
      CreateTextExpansionModelApiLogic,
      ['makeRequest as createTextExpansionModel', 'apiSuccess as createTextExpansionModelSuccess'],
      FetchTextExpansionModelApiLogic,
      ['makeRequest as fetchTextExpansionModel', 'apiSuccess as fetchTextExpansionModelSuccess'],
    ],
    values: [
      CreateTextExpansionModelApiLogic,
      ['data as createdTextExpansionModel', 'status as createTextExpansionModelStatus'],
      FetchTextExpansionModelApiLogic,
      ['data as textExpansionModel'],
    ],
  },
  events: ({ actions }) => ({
    afterMount: () => {
      console.log('afterMount');
      actions.fetchTextExpansionModel(undefined);
    },
  }),
  listeners: ({ actions }) => ({
    fetchTextExpansionModelSuccess: (data) => {
      console.log('fetchTextExpansionModelSuccess listener', data);
      if (data?.deploymentState === 'downloading') {
        console.log('START polling');
        actions.startPollingTextExpansionModel();
      } else if (data?.deploymentState === 'downloaded') {
        console.log('END polling');
        actions.stopPollingTextExpansionModel();
      }
    },
  }),
  path: ['enterprise_search', 'content', 'text_expansion_callout_logic'],
  selectors: ({ selectors }) => ({
    isCreateButtonDisabled: [
      () => [selectors.createTextExpansionModelStatus],
      (status: Status) => status !== Status.IDLE,
    ],
    isModelDownloadInProgress: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) => {
        console.log('isModelDownloadInProgress', data);
        return data?.deploymentState === 'downloading';
      },
    ],
    isModelDownloaded: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) => {
        console.log('isModelDownloaded', data);
        return data?.deploymentState === 'downloaded';
      },
    ],
  }),
});
