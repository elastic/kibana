/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpError, Status } from '../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
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
import {
  StartTextExpansionModelApiLogic,
  StartTextExpansionModelApiLogicActions,
} from '../../../../api/ml_models/text_expansion/start_text_expansion_model_api_logic';

const FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION = 5000; // 5 seconds
const FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

interface TextExpansionCalloutActions {
  clearTextExpansionModelPollingId: () => void;
  createTextExpansionModel: CreateTextExpansionModelApiLogicActions['makeRequest'];
  createTextExpansionModelPollingTimeout: (duration: number) => { duration: number };
  createTextExpansionModelSuccess: CreateTextExpansionModelApiLogicActions['apiSuccess'];
  fetchTextExpansionModel: FetchTextExpansionModelApiLogicActions['makeRequest'];
  fetchTextExpansionModelError: FetchTextExpansionModelApiLogicActions['apiError'];
  fetchTextExpansionModelSuccess: FetchTextExpansionModelApiLogicActions['apiSuccess'];
  setTextExpansionModelPollingId: (pollTimeoutId: ReturnType<typeof setTimeout>) => {
    pollTimeoutId: ReturnType<typeof setTimeout>;
  };
  startPollingTextExpansionModel: () => void;
  startTextExpansionModel: StartTextExpansionModelApiLogicActions['makeRequest'];
  startTextExpansionModelSuccess: StartTextExpansionModelApiLogicActions['apiSuccess'];
  stopPollingTextExpansionModel: () => void;
  textExpansionModel: FetchTextExpansionModelApiLogicActions['apiSuccess'];
}

export interface TextExpansionCalloutError {
  title: string;
  message: string;
}

export interface TextExpansionCalloutValues {
  createTextExpansionModelError: HttpError | undefined;
  createTextExpansionModelStatus: Status;
  createdTextExpansionModel: CreateTextExpansionModelResponse | undefined;
  fetchTextExpansionModelError: HttpError | undefined;
  isCreateButtonDisabled: boolean;
  isModelDownloadInProgress: boolean;
  isModelDownloaded: boolean;
  isModelRunningSingleThreaded: boolean;
  isModelStarted: boolean;
  isPollingTextExpansionModelActive: boolean;
  isStartButtonDisabled: boolean;
  startTextExpansionModelError: HttpError | undefined;
  startTextExpansionModelStatus: Status;
  textExpansionModel: FetchTextExpansionModelResponse | undefined;
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
  },
  connect: {
    actions: [
      CreateTextExpansionModelApiLogic,
      [
        'makeRequest as createTextExpansionModel',
        'apiSuccess as createTextExpansionModelSuccess',
        'apiError as createTextExpansionModelError',
      ],
      FetchTextExpansionModelApiLogic,
      [
        'makeRequest as fetchTextExpansionModel',
        'apiSuccess as fetchTextExpansionModelSuccess',
        'apiError as fetchTextExpansionModelError',
      ],
      StartTextExpansionModelApiLogic,
      [
        'makeRequest as startTextExpansionModel',
        'apiSuccess as startTextExpansionModelSuccess',
        'apiError as startTextExpansionModelError',
      ],
    ],
    values: [
      CreateTextExpansionModelApiLogic,
      [
        'data as createdTextExpansionModel',
        'status as createTextExpansionModelStatus',
        'error as createTextExpansionModelError',
      ],
      FetchTextExpansionModelApiLogic,
      ['data as textExpansionModel', 'error as fetchTextExpansionModelError'],
      StartTextExpansionModelApiLogic,
      ['status as startTextExpansionModelStatus', 'error as startTextExpansionModelError'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.fetchTextExpansionModel(undefined);
    },
    beforeUnmount: () => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        actions.stopPollingTextExpansionModel();
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    createTextExpansionModelPollingTimeout: ({ duration }) => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        clearTimeout(values.textExpansionModelPollTimeoutId);
      }
      const timeoutId = setTimeout(() => {
        actions.fetchTextExpansionModel(undefined);
      }, duration);
      actions.setTextExpansionModelPollingId(timeoutId);
    },
    createTextExpansionModelSuccess: () => {
      actions.fetchTextExpansionModel(undefined);
      actions.startPollingTextExpansionModel();
    },
    fetchTextExpansionModelError: () => {
      if (values.isPollingTextExpansionModelActive) {
        actions.createTextExpansionModelPollingTimeout(
          FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION_ON_FAILURE
        );
      }
    },
    fetchTextExpansionModelSuccess: (data) => {
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
    startPollingTextExpansionModel: () => {
      if (values.textExpansionModelPollTimeoutId !== null) {
        clearTimeout(values.textExpansionModelPollTimeoutId);
      }
      actions.createTextExpansionModelPollingTimeout(FETCH_TEXT_EXPANSION_MODEL_POLLING_DURATION);
    },
    startTextExpansionModelSuccess: () => {
      actions.fetchTextExpansionModel(undefined);
    },
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
  },
  selectors: ({ selectors }) => ({
    isCreateButtonDisabled: [
      () => [selectors.createTextExpansionModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelDownloadInProgress: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Downloading,
    ],
    isModelDownloaded: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Downloaded,
    ],
    isModelStarted: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) =>
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
      () => [
        selectors.createTextExpansionModelError,
        selectors.fetchTextExpansionModelError,
        selectors.startTextExpansionModelError,
      ],
      (
        createTextExpansionError: TextExpansionCalloutValues['createTextExpansionModelError'],
        fetchTextExpansionError: TextExpansionCalloutValues['fetchTextExpansionModelError'],
        startTextExpansionError: TextExpansionCalloutValues['startTextExpansionModelError']
      ) =>
        getTextExpansionError(
          createTextExpansionError,
          fetchTextExpansionError,
          startTextExpansionError
        ),
    ],
    isStartButtonDisabled: [
      () => [selectors.startTextExpansionModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelRunningSingleThreaded: [
      () => [selectors.textExpansionModel],
      (data: FetchTextExpansionModelResponse) =>
        // Running single threaded if model has max 1 deployment on 1 node with 1 thread
        data?.targetAllocationCount * data?.threadsPerAllocation <= 1,
    ],
  }),
});
