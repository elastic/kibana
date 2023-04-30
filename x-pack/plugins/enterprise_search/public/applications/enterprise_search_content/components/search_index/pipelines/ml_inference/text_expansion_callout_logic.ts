/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../common/types/ml';
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

export interface TextExpansionCalloutValues {
  createTextExpansionModelStatus: Status;
  createdTextExpansionModel: CreateTextExpansionModelResponse | undefined;
  isCreateButtonDisabled: boolean;
  isModelDownloadInProgress: boolean;
  isModelDownloaded: boolean;
  isModelStarted: boolean;
  isPollingTextExpansionModelActive: boolean;
  isStartButtonDisabled: boolean;
  startTextExpansionModelStatus: Status;
  textExpansionModel: FetchTextExpansionModelResponse | undefined;
  textExpansionModelPollTimeoutId: null | ReturnType<typeof setTimeout>;
}

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
      ['makeRequest as createTextExpansionModel', 'apiSuccess as createTextExpansionModelSuccess'],
      FetchTextExpansionModelApiLogic,
      [
        'makeRequest as fetchTextExpansionModel',
        'apiSuccess as fetchTextExpansionModelSuccess',
        'apiError as fetchTextExpansionModelError',
      ],
      StartTextExpansionModelApiLogic,
      ['makeRequest as startTextExpansionModel', 'apiSuccess as startTextExpansionModelSuccess'],
    ],
    values: [
      CreateTextExpansionModelApiLogic,
      ['data as createdTextExpansionModel', 'status as createTextExpansionModelStatus'],
      FetchTextExpansionModelApiLogic,
      ['data as textExpansionModel'],
      StartTextExpansionModelApiLogic,
      ['status as startTextExpansionModelStatus'],
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
      (status: Status) => status !== Status.IDLE,
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
    isStartButtonDisabled: [
      () => [selectors.startTextExpansionModelStatus],
      (status: Status) => status !== Status.IDLE,
    ],
  }),
});
