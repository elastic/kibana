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
}

export interface TextExpansionCalloutValues {
  createdTextExpansionModel: CreateTextExpansionModelResponse | undefined;
  createTextExpansionModelStatus: Status;
  isCreateButtonDisabled: boolean;
}

export const TextExpansionCalloutLogic = kea<
  MakeLogicType<TextExpansionCalloutValues, TextExpansionCalloutActions>
>({
  actions: {},
  connect: {
    actions: [
      CreateTextExpansionModelApiLogic,
      ['makeRequest as createTextExpansionModel', 'apiSuccess as createTextExpansionModelSuccess'],
    ],
    values: [
      CreateTextExpansionModelApiLogic,
      ['data as createdTextExpansionModel', 'status as createTextExpansionModelStatus'],
    ],
  },
  path: ['enterprise_search', 'content', 'text_expansion_callout_logic'],
  selectors: ({ selectors }) => ({
    isCreateButtonDisabled: [
      () => [selectors.createTextExpansionModelStatus],
      (status: Status) => status !== Status.IDLE,
    ],
  }),
});
