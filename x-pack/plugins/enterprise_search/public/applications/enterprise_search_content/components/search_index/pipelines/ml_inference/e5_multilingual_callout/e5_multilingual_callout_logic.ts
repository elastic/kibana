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

import {
  CreateE5MultilingualModelApiLogic,
  CreateE5MultilingualModelApiLogicActions,
  CreateE5MultilingualModelResponse,
} from '../../../../../api/ml_models/e5_multilingual/create_e5_multilingual_model_api_logic';
import {
  FetchE5MultilingualModelApiLogic,
  FetchE5MultilingualModelApiLogicActions,
  FetchE5MultilingualModelResponse,
} from '../../../../../api/ml_models/e5_multilingual/fetch_e5_multilingual_model_api_logic';
import {
  StartE5MultilingualModelApiLogic,
  StartE5MultilingualModelApiLogicActions,
} from '../../../../../api/ml_models/e5_multilingual/start_e5_multilingual_model_api_logic';

const FETCH_E5_MULTILINGUAL_MODEL_POLLING_DURATION = 5000; // 5 seconds
const FETCH_E5_MULTILINGUAL_MODEL_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds
const E5_MULTILINGUAL_MODEL_ID = '.multilingual-e5-small';

interface E5MultilingualCalloutActions {
  clearE5MultilingualModelPollingId: () => void;
  createE5MultilingualModel: () => void;
  createE5MultilingualModelMakeRequest: CreateE5MultilingualModelApiLogicActions['makeRequest'];
  createE5MultilingualModelPollingTimeout: (duration: number) => { duration: number };
  createE5MultilingualModelSuccess: CreateE5MultilingualModelApiLogicActions['apiSuccess'];
  fetchE5MultilingualModel: () => void;
  fetchE5MultilingualModelMakeRequest: FetchE5MultilingualModelApiLogicActions['makeRequest'];
  fetchE5MultilingualModelError: FetchE5MultilingualModelApiLogicActions['apiError'];
  fetchE5MultilingualModelSuccess: FetchE5MultilingualModelApiLogicActions['apiSuccess'];
  setE5MultilingualModelPollingId: (pollTimeoutId: ReturnType<typeof setTimeout>) => {
    pollTimeoutId: ReturnType<typeof setTimeout>;
  };
  startPollingE5MultilingualModel: () => void;
  startE5MultilingualModel: () => void;
  startE5MultilingualModelMakeRequest: StartE5MultilingualModelApiLogicActions['makeRequest'];
  startE5MultilingualModelSuccess: StartE5MultilingualModelApiLogicActions['apiSuccess'];
  stopPollingE5MultilingualModel: () => void;
  e5MultilingualModel: FetchE5MultilingualModelApiLogicActions['apiSuccess'];
}

export interface E5MultilingualCalloutError {
  title: string;
  message: string;
}

export interface E5MultilingualCalloutValues {
  createE5MultilingualModelError: HttpError | undefined;
  createE5MultilingualModelStatus: Status;
  createdE5MultilingualModel: CreateE5MultilingualModelResponse | undefined;
  fetchE5MultilingualModelError: HttpError | undefined;
  isCreateButtonDisabled: boolean;
  isModelDownloadInProgress: boolean;
  isModelDownloaded: boolean;
  isModelRunningSingleThreaded: boolean;
  isModelStarted: boolean;
  isPollingE5MultilingualModelActive: boolean;
  isStartButtonDisabled: boolean;
  startE5MultilingualModelError: HttpError | undefined;
  startE5MultilingualModelStatus: Status;
  e5MultilingualModel: FetchE5MultilingualModelResponse | undefined;
  e5MultilingualModelPollTimeoutId: null | ReturnType<typeof setTimeout>;
  e5MultilingualError: E5MultilingualCalloutError | null;
}

/**
 * Extracts the topmost error in precedence order (create > start > fetch).
 * @param createError
 * @param fetchError
 * @param startError
 * @returns the extracted error or null if there is no error
 */
export const getE5MultilingualError = (
  createError: HttpError | undefined,
  fetchError: HttpError | undefined,
  startError: HttpError | undefined
) => {
  return createError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCreateError.title',
          {
            defaultMessage: 'Error with E5 Multilingual deployment',
          }
        ),
        message: getErrorsFromHttpResponse(createError)[0],
      }
    : startError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualStartError.title',
          {
            defaultMessage: 'Error starting E5 Multilingual deployment',
          }
        ),
        message: getErrorsFromHttpResponse(startError)[0],
      }
    : fetchError !== undefined
    ? {
        title: i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualFetchError.title',
          {
            defaultMessage: 'Error fetching E5 Multilingual model',
          }
        ),
        message: getErrorsFromHttpResponse(fetchError)[0],
      }
    : null;
};

export const E5MultilingualCalloutLogic = kea<
  MakeLogicType<E5MultilingualCalloutValues, E5MultilingualCalloutActions>
>({
  actions: {
    clearE5MultilingualModelPollingId: true,
    createE5MultilingualModelPollingTimeout: (duration) => ({ duration }),
    setE5MultilingualModelPollingId: (pollTimeoutId: ReturnType<typeof setTimeout>) => ({
      pollTimeoutId,
    }),
    startPollingE5MultilingualModel: true,
    stopPollingE5MultilingualModel: true,
    createE5MultilingualModel: true,
    fetchE5MultilingualModel: true,
    startE5MultilingualModel: true,
  },
  connect: {
    actions: [
      CreateE5MultilingualModelApiLogic,
      [
        'makeRequest as createE5MultilingualModelMakeRequest',
        'apiSuccess as createE5MultilingualModelSuccess',
        'apiError as createE5MultilingualModelError',
      ],
      FetchE5MultilingualModelApiLogic,
      [
        'makeRequest as fetchE5MultilingualModelMakeRequest',
        'apiSuccess as fetchE5MultilingualModelSuccess',
        'apiError as fetchE5MultilingualModelError',
      ],
      StartE5MultilingualModelApiLogic,
      [
        'makeRequest as startE5MultilingualModelMakeRequest',
        'apiSuccess as startE5MultilingualModelSuccess',
        'apiError as startE5MultilingualModelError',
      ],
    ],
    values: [
      CreateE5MultilingualModelApiLogic,
      [
        'data as createdE5MultilingualModel',
        'status as createE5MultilingualModelStatus',
        'error as createE5MultilingualModelError',
      ],
      FetchE5MultilingualModelApiLogic,
      ['data as e5MultilingualModel', 'error as fetchE5MultilingualModelError'],
      StartE5MultilingualModelApiLogic,
      ['status as startE5MultilingualModelStatus', 'error as startE5MultilingualModelError'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      actions.fetchE5MultilingualModel();
    },
    beforeUnmount: () => {
      if (values.e5MultilingualModelPollTimeoutId !== null) {
        actions.stopPollingE5MultilingualModel();
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    createE5MultilingualModel: () =>
      actions.createE5MultilingualModelMakeRequest({ modelId: E5_MULTILINGUAL_MODEL_ID }),
    fetchE5MultilingualModel: () =>
      actions.fetchE5MultilingualModelMakeRequest({ modelId: E5_MULTILINGUAL_MODEL_ID }),
    startE5MultilingualModel: () =>
      actions.startE5MultilingualModelMakeRequest({ modelId: E5_MULTILINGUAL_MODEL_ID }),
    createE5MultilingualModelPollingTimeout: ({ duration }) => {
      if (values.e5MultilingualModelPollTimeoutId !== null) {
        clearTimeout(values.e5MultilingualModelPollTimeoutId);
      }
      const timeoutId = setTimeout(() => {
        actions.fetchE5MultilingualModel();
      }, duration);
      actions.setE5MultilingualModelPollingId(timeoutId);
    },
    createE5MultilingualModelSuccess: () => {
      actions.fetchE5MultilingualModel();
      actions.startPollingE5MultilingualModel();
    },
    fetchE5MultilingualModelError: () => {
      if (values.isPollingE5MultilingualModelActive) {
        actions.createE5MultilingualModelPollingTimeout(
          FETCH_E5_MULTILINGUAL_MODEL_POLLING_DURATION_ON_FAILURE
        );
      }
    },
    fetchE5MultilingualModelSuccess: (data) => {
      if (data?.deploymentState === MlModelDeploymentState.Downloading) {
        if (!values.isPollingE5MultilingualModelActive) {
          actions.startPollingE5MultilingualModel();
        } else {
          actions.createE5MultilingualModelPollingTimeout(
            FETCH_E5_MULTILINGUAL_MODEL_POLLING_DURATION
          );
        }
      } else if (
        data?.deploymentState === MlModelDeploymentState.Downloaded &&
        values.isPollingE5MultilingualModelActive
      ) {
        actions.stopPollingE5MultilingualModel();
      }
    },
    startPollingE5MultilingualModel: () => {
      if (values.e5MultilingualModelPollTimeoutId !== null) {
        clearTimeout(values.e5MultilingualModelPollTimeoutId);
      }
      actions.createE5MultilingualModelPollingTimeout(FETCH_E5_MULTILINGUAL_MODEL_POLLING_DURATION);
    },
    startE5MultilingualModelSuccess: () => {
      actions.fetchE5MultilingualModel();
    },
    stopPollingE5MultilingualModel: () => {
      if (values.e5MultilingualModelPollTimeoutId !== null) {
        clearTimeout(values.e5MultilingualModelPollTimeoutId);
        actions.clearE5MultilingualModelPollingId();
      }
    },
  }),
  path: ['enterprise_search', 'content', 'e5_multilingual_callout_logic'],
  reducers: {
    e5MultilingualModelPollTimeoutId: [
      null,
      {
        clearE5MultilingualModelPollingId: () => null,
        setE5MultilingualModelPollingId: (_, { pollTimeoutId }) => pollTimeoutId,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isCreateButtonDisabled: [
      () => [selectors.createE5MultilingualModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelDownloadInProgress: [
      () => [selectors.e5MultilingualModel],
      (data: FetchE5MultilingualModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Downloading,
    ],
    isModelDownloaded: [
      () => [selectors.e5MultilingualModel],
      (data: FetchE5MultilingualModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Downloaded,
    ],
    isModelStarted: [
      () => [selectors.e5MultilingualModel],
      (data: FetchE5MultilingualModelResponse) =>
        data?.deploymentState === MlModelDeploymentState.Starting ||
        data?.deploymentState === MlModelDeploymentState.Started ||
        data?.deploymentState === MlModelDeploymentState.FullyAllocated,
    ],
    isPollingE5MultilingualModelActive: [
      () => [selectors.e5MultilingualModelPollTimeoutId],
      (pollingTimeoutId: E5MultilingualCalloutValues['e5MultilingualModelPollTimeoutId']) =>
        pollingTimeoutId !== null,
    ],
    e5MultilingualError: [
      () => [
        selectors.createE5MultilingualModelError,
        selectors.fetchE5MultilingualModelError,
        selectors.startE5MultilingualModelError,
      ],
      (
        createE5MultilingualError: E5MultilingualCalloutValues['createE5MultilingualModelError'],
        fetchE5MultilingualError: E5MultilingualCalloutValues['fetchE5MultilingualModelError'],
        startE5MultilingualError: E5MultilingualCalloutValues['startE5MultilingualModelError']
      ) =>
        getE5MultilingualError(
          createE5MultilingualError,
          fetchE5MultilingualError,
          startE5MultilingualError
        ),
    ],
    isStartButtonDisabled: [
      () => [selectors.startE5MultilingualModelStatus],
      (status: Status) => status !== Status.IDLE && status !== Status.ERROR,
    ],
    isModelRunningSingleThreaded: [
      () => [selectors.e5MultilingualModel],
      (data: FetchE5MultilingualModelResponse) =>
        // Running single threaded if model has max 1 deployment on 1 node with 1 thread
        data?.targetAllocationCount * data?.threadsPerAllocation <= 1,
    ],
  }),
});
