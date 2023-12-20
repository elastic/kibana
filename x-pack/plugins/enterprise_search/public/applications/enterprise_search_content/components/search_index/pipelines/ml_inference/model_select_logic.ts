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
  CachedFetchModelsApiLogic,
  CachedFetchModlesApiLogicActions,
} from '../../../../api/ml_models/cached_fetch_models_api_logic';
import {
  CreateModelApiLogic,
  CreateModelApiLogicActions,
} from '../../../../api/ml_models/create_model_api_logic';
import { FetchModelsApiResponse } from '../../../../api/ml_models/fetch_models_api_logic';
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
  createModel: (modelId: string) => { modelId: string };
  createModelError: CreateModelApiLogicActions['apiError'];
  createModelMakeRequest: CreateModelApiLogicActions['makeRequest'];
  createModelSuccess: CreateModelApiLogicActions['apiSuccess'];

  fetchModels: () => void;
  fetchModelsError: CachedFetchModlesApiLogicActions['apiError'];
  fetchModelsMakeRequest: CachedFetchModlesApiLogicActions['makeRequest'];
  fetchModelsSuccess: CachedFetchModlesApiLogicActions['apiSuccess'];
  startPollingModels: CachedFetchModlesApiLogicActions['startPolling'];

  startModel: (modelId: string) => { modelId: string };
  startModelError: CreateModelApiLogicActions['apiError'];
  startModelMakeRequest: StartModelApiLogicActions['makeRequest'];
  startModelSuccess: StartModelApiLogicActions['apiSuccess'];

  setInferencePipelineConfiguration: MLInferenceProcessorsActions['setInferencePipelineConfiguration'];
  setInferencePipelineConfigurationFromMLInferenceLogic: MLInferenceProcessorsActions['setInferencePipelineConfiguration'];
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
  isInitialLoading: boolean;
  modelStateChangeError: string | undefined;
  modelsData: FetchModelsApiResponse | undefined;
  modelsStatus: Status;
  selectableModels: MlModel[];
  selectedModel: MlModel | undefined;
  startModelError: HttpError | undefined;
  startModelStatus: Status;
}

export const ModelSelectLogic = kea<MakeLogicType<ModelSelectValues, ModelSelectActions>>({
  actions: {
    createModel: (modelId: string) => ({ modelId }),
    fetchModels: true,
    setInferencePipelineConfiguration: (configuration) => ({ configuration }),
    startModel: (modelId: string) => ({ modelId }),
  },
  connect: {
    actions: [
      CachedFetchModelsApiLogic,
      [
        'makeRequest as fetchModelsMakeRequest',
        'apiSuccess as fetchModelsSuccess',
        'apiError as fetchModelsError',
        'startPolling as startPollingModels',
      ],
      CreateModelApiLogic,
      [
        'makeRequest as createModelMakeRequest',
        'apiSuccess as createModelSuccess',
        'apiError as createModelError',
      ],
      MLInferenceLogic,
      [
        'setInferencePipelineConfiguration as setInferencePipelineConfigurationFromMLInferenceLogic',
      ],
      StartModelApiLogic,
      [
        'makeRequest as startModelMakeRequest',
        'apiSuccess as startModelSuccess',
        'apiError as startModelError',
      ],
    ],
    values: [
      CachedFetchModelsApiLogic,
      ['modelsData', 'status as modelsStatus', 'isInitialLoading'],
      CreateModelApiLogic,
      ['status as createModelStatus', 'error as createModelError'],
      IndexViewLogic,
      ['ingestionMethod as ingestionMethodFromIndexViewLogic'],
      MLInferenceLogic,
      ['addInferencePipelineModal as addInferencePipelineModalFromMLInferenceLogic'],
      StartModelApiLogic,
      ['status as startModelStatus', 'error as startModelError'],
    ],
  },
  events: ({ actions }) => ({
    afterMount: () => {
      actions.startPollingModels();
    },
  }),
  listeners: ({ actions }) => ({
    createModel: ({ modelId }) => {
      actions.createModelMakeRequest({ modelId });
    },
    createModelSuccess: () => {
      actions.startPollingModels();
    },
    fetchModels: () => {
      actions.fetchModelsMakeRequest({});
    },
    startModel: ({ modelId }) => {
      actions.startModelMakeRequest({ modelId });
    },
    setInferencePipelineConfiguration: ({ configuration }) => {
      actions.setInferencePipelineConfigurationFromMLInferenceLogic(configuration);
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
      () => [selectors.modelsData],
      (response: FetchModelsApiResponse) => response ?? [],
    ],
    selectedModel: [
      () => [selectors.selectableModels, selectors.addInferencePipelineModal],
      (
        models: MlModel[],
        addInferencePipelineModal: MLInferenceProcessorsValues['addInferencePipelineModal']
      ) => models.find((m) => m.modelId === addInferencePipelineModal.configuration.modelID),
    ],
    isLoading: [() => [selectors.isInitialLoading], (isInitialLoading) => isInitialLoading],
  }),
});
