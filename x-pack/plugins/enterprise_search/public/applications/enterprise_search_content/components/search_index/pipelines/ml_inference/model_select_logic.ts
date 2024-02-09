/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpError, Status } from '../../../../../../../common/types/api';
import { MlModel } from '../../../../../../../common/types/ml';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import {
  CreateModelApiLogic,
  CreateModelApiLogicActions,
} from '../../../../api/ml_models/create_model_api_logic';
import {
  StartModelApiLogic,
  StartModelApiLogicActions,
} from '../../../../api/ml_models/start_model_api_logic';
import { IndexViewLogic } from '../../index_view_logic';

import {
  MLInferenceLogic,
  MLInferenceProcessorsActions,
  MLInferenceProcessorsValues,
} from './ml_inference_logic';

export interface ModelSelectActions {
  clearModelPlaceholderFlagFromMLInferenceLogic: MLInferenceProcessorsActions['clearModelPlaceholderFlag'];
  createModel: (modelId: string) => { modelId: string };
  createModelError: CreateModelApiLogicActions['apiError'];
  createModelMakeRequest: CreateModelApiLogicActions['makeRequest'];
  createModelSuccess: CreateModelApiLogicActions['apiSuccess'];
  setInferencePipelineConfiguration: MLInferenceProcessorsActions['setInferencePipelineConfiguration'];
  setInferencePipelineConfigurationFromMLInferenceLogic: MLInferenceProcessorsActions['setInferencePipelineConfiguration'];
  startModel: (modelId: string) => { modelId: string };
  startModelError: CreateModelApiLogicActions['apiError'];
  startModelMakeRequest: StartModelApiLogicActions['makeRequest'];
  startModelSuccess: StartModelApiLogicActions['apiSuccess'];
  startPollingModels: MLInferenceProcessorsActions['startPollingModels'];
}

export interface ModelSelectValues {
  addInferencePipelineModal: MLInferenceProcessorsValues['addInferencePipelineModal'];
  addInferencePipelineModalFromMLInferenceLogic: MLInferenceProcessorsValues['addInferencePipelineModal'];
  areActionButtonsDisabled: boolean;
  createModelError: HttpError | undefined;
  createModelStatus: Status;
  ingestionMethod: string;
  ingestionMethodFromIndexViewLogic: string;
  isLoading: boolean;
  isModelsInitialLoadingFromMLInferenceLogic: boolean;
  modelStateChangeError: string | undefined;
  selectableModels: MlModel[];
  selectableModelsFromMLInferenceLogic: MlModel[];
  selectedModel: MlModel | undefined;
  selectedModelFromMLInferenceLogic: MlModel | undefined;
  startModelError: HttpError | undefined;
  startModelStatus: Status;
}

export const ModelSelectLogic = kea<MakeLogicType<ModelSelectValues, ModelSelectActions>>({
  actions: {
    createModel: (modelId: string) => ({ modelId }),
    setInferencePipelineConfiguration: (configuration) => ({ configuration }),
    startModel: (modelId: string) => ({ modelId }),
  },
  connect: {
    actions: [
      CreateModelApiLogic,
      [
        'makeRequest as createModelMakeRequest',
        'apiSuccess as createModelSuccess',
        'apiError as createModelError',
      ],
      MLInferenceLogic,
      [
        'clearModelPlaceholderFlag as clearModelPlaceholderFlagFromMLInferenceLogic',
        'setInferencePipelineConfiguration as setInferencePipelineConfigurationFromMLInferenceLogic',
        'startPollingModels',
      ],
      StartModelApiLogic,
      [
        'makeRequest as startModelMakeRequest',
        'apiSuccess as startModelSuccess',
        'apiError as startModelError',
      ],
    ],
    values: [
      CreateModelApiLogic,
      ['status as createModelStatus', 'error as createModelError'],
      IndexViewLogic,
      ['ingestionMethod as ingestionMethodFromIndexViewLogic'],
      MLInferenceLogic,
      [
        'addInferencePipelineModal as addInferencePipelineModalFromMLInferenceLogic',
        'isModelsInitialLoading as isModelsInitialLoadingFromMLInferenceLogic',
        'selectableModels as selectableModelsFromMLInferenceLogic',
        'selectedModel as selectedModelFromMLInferenceLogic',
      ],
      StartModelApiLogic,
      ['status as startModelStatus', 'error as startModelError'],
    ],
  },
  listeners: ({ actions }) => ({
    createModel: ({ modelId }) => {
      actions.createModelMakeRequest({ modelId });
    },
    createModelSuccess: (response) => {
      actions.startPollingModels();
      // The create action succeeded, so the model is no longer a placeholder
      actions.clearModelPlaceholderFlagFromMLInferenceLogic(response.modelId);
    },
    setInferencePipelineConfiguration: ({ configuration }) => {
      actions.setInferencePipelineConfigurationFromMLInferenceLogic(configuration);
    },
    startModel: ({ modelId }) => {
      actions.startModelMakeRequest({ modelId });
    },
    startModelSuccess: () => {
      actions.startPollingModels();
    },
  }),
  path: ['enterprise_search', 'content', 'model_select_logic'],
  selectors: ({ selectors }) => ({
    addInferencePipelineModal: [
      () => [selectors.addInferencePipelineModalFromMLInferenceLogic],
      (modal) => modal, // Pass-through
    ],
    areActionButtonsDisabled: [
      () => [selectors.createModelStatus, selectors.startModelStatus],
      (createModelStatus: Status, startModelStatus: Status) =>
        createModelStatus === Status.LOADING || startModelStatus === Status.LOADING,
    ],
    ingestionMethod: [
      () => [selectors.ingestionMethodFromIndexViewLogic],
      (ingestionMethod) => ingestionMethod, // Pass-through
    ],
    modelStateChangeError: [
      () => [selectors.createModelError, selectors.startModelError],
      (createModelError?: HttpError, startModelError?: HttpError) => {
        if (!createModelError && !startModelError) return undefined;

        return getErrorsFromHttpResponse(createModelError ?? startModelError!)[0];
      },
    ],
    selectableModels: [
      () => [selectors.selectableModelsFromMLInferenceLogic],
      (selectableModels) => selectableModels, // Pass-through
    ],
    selectedModel: [
      () => [selectors.selectedModelFromMLInferenceLogic],
      (selectedModel) => selectedModel, // Pass-through
    ],
    isLoading: [
      () => [selectors.isModelsInitialLoadingFromMLInferenceLogic],
      (isModelsInitialLoading) => isModelsInitialLoading, // Pass-through
    ],
  }),
});
