/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpError, Status } from '../../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../../common/types/ml';
import { getErrorsFromHttpResponse } from '../../../../../../shared/flash_messages/handle_api_errors';

import { KibanaLogic } from '../../../../../../shared/kibana';

import {
  CreateModelApiLogic,
  CreateModelApiLogicActions,
  CreateModelResponse,
} from '../../../../../api/ml_models/create_model_api_logic';
import {
  FetchModelApiLogic,
  FetchModelApiLogicActions,
  FetchModelResponse,
} from '../../../../../api/ml_models/fetch_model_api_logic';
import {
  StartModelApiLogic,
  StartModelApiLogicActions,
} from '../../../../../api/ml_models/start_model_api_logic';

const FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION = 5000; // 5 seconds
const FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

interface TextExpansionCalloutActions {
  clearTextExpansionModelPollingId: () => void;
  createModelMakeRequest: CreateModelApiLogicActions['makeRequest'];
  createModelSuccess: CreateModelApiLogicActions['apiSuccess'];
  createTextExpansionModel: () => void;
  createTextExpansionModelPollingTimeout: (duration: number) => { duration: number };
  fetchModelMakeRequest: FetchModelApiLogicActions['makeRequest'];
  fetchModelError: FetchModelApiLogicActions['apiError'];
  fetchModelSuccess: FetchModelApiLogicActions['apiSuccess'];
  fetchTextExpansionModel: () => void;
  setTextExpansionModelPollingId: (pollTimeoutId: ReturnType<typeof setTimeout>) => {
    pollTimeoutId: ReturnType<typeof setTimeout>;
  };
  startModelMakeRequest: StartModelApiLogicActions['makeRequest'];
  startModelSuccess: StartModelApiLogicActions['apiSuccess'];
  startPollingTextExpansionModel: () => void;
  startTextExpansionModel: () => void;
  stopPollingTextExpansionModel: () => void;
  textExpansionModel: FetchModelApiLogicActions['apiSuccess'];
  setElserModelId: (elserModelId: string) => { elserModelId: string };
}

export interface TextExpansionCalloutError {
  title: string;
  message: string;
}

export interface TextExpansionCalloutValues {
  elserModelId: string;
  createModelError: HttpError | undefined;
  createModelStatus: Status;
  createdModel: CreateModelResponse | undefined;
  fetchModelError: HttpError | undefined;
  isCreateButtonDisabled: boolean;
  isModelDownloadInProgress: boolean;
  isModelDownloaded: boolean;
  isModelRunningSingleThreaded: boolean;
  isModelStarted: boolean;
  isPollingTextExpansionModelActive: boolean;
  isStartButtonDisabled: boolean;
  startModelError: HttpError | undefined;
  startModelStatus: Status;
  textExpansionModel: FetchModelResponse | undefined;
  textExpansionModelPollTimeoutId: null | ReturnType<typeof setTimeout>;
  textExpansionError: TextExpansionCalloutError | null;
}

/**
 * Extracts the topmost error in precedence order (create > start > fetch).
 * @param createError
 * @param fetchError
 * @param startError
 * @returns the extracted error or null if there is no error
 */
export const getTextExpansionError = (
  createError: HttpError | undefined,
  fetchError: HttpError | undefined,
  startError: HttpError | undefined
) => {
  return createError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCreateError.title',
          {
            defaultMessage: 'Error with ELSER deployment',
          }
        ),
        message: getErrorsFromHttpResponse(createError)[0],
      }
    : startError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.textExpansionStartError.title',
          {
            defaultMessage: 'Error starting ELSER deployment',
          }
        ),
        message: getErrorsFromHttpResponse(startError)[0],
      }
    : fetchError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.textExpansionFetchError.title',
          {
            defaultMessage: 'Error fetching ELSER model',
          }
        ),
        message: getErrorsFromHttpResponse(fetchError)[0],
      }
    : null;
};

export const TextExpansionCalloutLogic = kea<
  MakeLogicType<TextExpansionCalloutValues, TextExpansionCalloutActions>
>({
  actions: {
    clearTextExpansionModelPollingId: true,
    createTextExpansionModelPollingTimeout: (duration) => ({ duration }),
    setTextExpansionModelPollingId: (pollTimeoutId: ReturnType<typeof setTimeout>) => ({
      pollTimeoutId,
    }),
    startPollingTextExpansionModel: true,
    stopPollingTextExpansionModel: true,
    setElserModelId: (elserModelId) => ({ elserModelId }),
    createTextExpansionModel: true,
    fetchTextExpansionModel: true,
    startTextExpansionModel: true,
  },
  connect: {
    actions: [
      CreateModelApiLogic,
      [
        'makeRequest as createModelMakeRequest',
        'apiSuccess as createModelSuccess',
        'apiError as createModelError',
      ],
      FetchModelApiLogic,
      [
        'makeRequest as fetchModelMakeRequest',
        'apiSuccess as fetchModelSuccess',
        'apiError as fetchModelError',
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
      ['data as createdModel', 'status as createModelStatus', 'error as createModelError'],
      FetchModelApiLogic,
      ['data as textExpansionModel', 'error as fetchModelError'],
      StartModelApiLogic,
      ['status as startModelStatus', 'error as startModelError'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: async () => {
      const elserModel = await KibanaLogic.values.ml.elasticModels?.getELSER({ version: 2 });
      if (elserModel != null) {
        actions.setElserModelId(elserModel.model_id);
        actions.fetchTextExpansionModel();
      }
    },
    beforeUnmount: () => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        actions.stopPollingTextExpansionModel();
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    createModelSuccess: () => {
      actions.fetchTextExpansionModel();
      actions.startPollingTextExpansionModel();
    },
    createTextExpansionModel: () =>
      actions.createModelMakeRequest({ modelId: values.elserModelId }),
    createTextExpansionModelPollingTimeout: ({ duration }) => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        clearTimeout(values.textExpansionModelPollTimeoutId);
      }
      const timeoutId = setTimeout(() => {
        actions.fetchTextExpansionModel();
      }, duration);
      actions.setTextExpansionModelPollingId(timeoutId);
    },
    fetchTextExpansionModel: () => actions.fetchModelMakeRequest({ modelId: values.elserModelId }),
    fetchModelError: () => {
      if (values.isPollingTextExpansionModelActive) {
        actions.createTextExpansionModelPollingTimeout(
          FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION_ON_FAILURE
        );
      }
    },
    fetchModelSuccess: (data) => {
      if (data?.deploymentState === MlModelDeploymentState.Downloading) {
        if (!values.isPollingTextExpansionModelActive) {
          actions.startPollingTextExpansionModel();
        } else {
          actions.createTextExpansionModelPollingTimeout(
            FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION
          );
        }
      } else if (
        data?.deploymentState === MlModelDeploymentState.Downloaded &&
        values.isPollingTextExpansionModelActive
      ) {
        actions.stopPollingTextExpansionModel();
      }
    },
    startModelSuccess: () => {
      actions.fetchTextExpansionModel();
    },
    startPollingTextExpansionModel: () => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        clearTimeout(values.textExpansionModelPollTimeoutId);
      }
      actions.createTextExpansionModelPollingTimeout(FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION);
    },
    startTextExpansionModel: () => actions.startModelMakeRequest({ modelId: values.elserModelId }),
    stopPollingTextExpansionModel: () => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        clearTimeout(values.textExpansionModelPollTimeoutId);
        actions.clearTextExpansionModelPollingId();
      }
    },
  }),
  path: ['enterprise_search', 'content', 'text_expansion_callout_logic'],
  reducers: {
    textExpansionModelPollTimeoutId: [
      null,
      {
        clearTextExpansionModelPollingId: () => null,
        setTextExpansionModelPollingId: (_, { pollTimeoutId }) => pollTimeoutId,
      },
    ],
    elserModelId: [
      '',
      {
        setElserModelId: (_, { elserModelId }) => elserModelId,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isCreateButtonDisabled: [
      () => [selectors.createModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelDownloadInProgress: [
      () => [selectors.textExpansionModel],
      (data: FetchModelResponse) => data?.deploymentState === MlModelDeploymentState.Downloading,
    ],
    isModelDownloaded: [
      () => [selectors.textExpansionModel],
      (data: FetchModelResponse) => data?.deploymentState === MlModelDeploymentState.Downloaded,
    ],
    isModelStarted: [
      () => [selectors.textExpansionModel],
      (data: FetchModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Starting ||
        data?.deploymentState === MlModelDeploymentState.Started ||
        data?.deploymentState === MlModelDeploymentState.FullyAllocated,
    ],
    isPollingTextExpansionModelActive: [
      () => [selectors.textExpansionModelPollTimeoutId],
      (pollingTimeoutId: TextExpansionCalloutValues['textExpansionModelPollTimeoutId']) =>
        pollingTimeoutId !== null,
    ],
    textExpansionError: [
      () => [selectors.createModelError, selectors.fetchModelError, selectors.startModelError],
      (
        createError: TextExpansionCalloutValues['createModelError'],
        fetchError: TextExpansionCalloutValues['fetchModelError'],
        startError: TextExpansionCalloutValues['startModelError']
      ) => getTextExpansionError(createError, fetchError, startError),
    ],
    isStartButtonDisabled: [
      () => [selectors.startModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelRunningSingleThreaded: [
      () => [selectors.textExpansionModel],
      (data: FetchModelResponse) =>
        // Running single threaded if model has max 1 deployment on 1 node with 1 thread
        data?.targetAllocationCount * data?.threadsPerAllocation <= 1,
    ],
  }),
});
