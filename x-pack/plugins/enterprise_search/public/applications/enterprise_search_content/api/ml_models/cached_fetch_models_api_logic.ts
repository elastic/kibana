/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isEqual } from 'lodash';

import { Status } from '../../../../../common/types/api';
import { MlModel } from '../../../../../common/types/ml';
import { Actions } from '../../../shared/api_logic/create_api_logic';

import { FetchModelsApiLogic, FetchModelsApiResponse } from './fetch_models_api_logic';

const FETCH_MODELS_POLLING_DURATION = 5000; // 5 seconds
const FETCH_MODELS_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

export type { FetchModelsApiResponse } from './fetch_models_api_logic';

export interface CachedFetchModlesApiLogicActions {
  apiError: Actions<{}, FetchModelsApiResponse>['apiError'];
  apiReset: Actions<{}, FetchModelsApiResponse>['apiReset'];
  apiSuccess: Actions<{}, FetchModelsApiResponse>['apiSuccess'];
  clearPollTimeout(): void;
  createPollTimeout(duration: number): { duration: number };
  makeRequest: Actions<{}, FetchModelsApiResponse>['makeRequest'];
  setTimeoutId(id: NodeJS.Timeout): { id: NodeJS.Timeout };
  startPolling(): void;
  stopPolling(): void;
}

export interface CachedFetchModelsApiLogicValues {
  data: FetchModelsApiResponse;
  isInitialLoading: boolean;
  isLoading: boolean;
  modelsData: MlModel[] | null;
  pollTimeoutId: NodeJS.Timeout | null;
  status: Status;
}

export const CachedFetchModelsApiLogic = kea<
  MakeLogicType<CachedFetchModelsApiLogicValues, CachedFetchModlesApiLogicActions>
>({
  actions: {
    clearPollTimeout: true,
    createPollTimeout: (duration) => ({ duration }),
    setTimeoutId: (id) => ({ id }),
    startPolling: true,
    stopPolling: true,
  },
  connect: {
    actions: [FetchModelsApiLogic, ['apiSuccess', 'apiError', 'apiReset', 'makeRequest']],
    values: [FetchModelsApiLogic, ['data', 'status']],
  },
  events: ({ values }) => ({
    beforeUnmount: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
    },
  }),
  listeners: ({ actions, values }) => ({
    apiError: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_MODELS_POLLING_DURATION_ON_FAILURE);
      }
    },
    apiSuccess: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_MODELS_POLLING_DURATION);
      }
    },
    createPollTimeout: ({ duration }) => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        actions.makeRequest({});
      }, duration);
      actions.setTimeoutId(timeoutId);
    },
    startPolling: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
      actions.makeRequest({});
      actions.createPollTimeout(FETCH_MODELS_POLLING_DURATION);
    },
    stopPolling: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
      actions.clearPollTimeout();
    },
  }),
  path: ['enterprise_search', 'content', 'api', 'fetch_models_api_wrapper'],
  reducers: {
    modelsData: [
      null,
      {
        apiReset: () => null,
        apiSuccess: (currentState, newState) =>
          isEqual(currentState, newState) ? currentState : newState,
      },
    ],
    pollTimeoutId: [
      null,
      {
        clearPollTimeout: () => null,
        setTimeoutId: (_, { id }) => id,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isInitialLoading: [
      () => [selectors.status, selectors.modelsData],
      (
        status: CachedFetchModelsApiLogicValues['status'],
        modelsData: CachedFetchModelsApiLogicValues['modelsData']
      ) => status === Status.IDLE || (modelsData === null && status === Status.LOADING),
    ],
  }),
});
