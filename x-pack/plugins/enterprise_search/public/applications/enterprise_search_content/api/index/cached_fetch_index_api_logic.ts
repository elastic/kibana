/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isEqual } from 'lodash';

import { Status } from '../../../../../common/types/api';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import { IndexNameLogic } from '../../components/search_index/index_name_logic';

import {
  FetchIndexApiParams,
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from './fetch_index_api_logic';

const FETCH_INDEX_POLLING_DURATION = 5000; // 5 seconds
const FETCH_INDEX_POLLING_DURATION_ON_FAILURE = 30000; // 30 seconds

export interface CachedFetchIndexApiLogicActions {
  apiError: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiError'];
  apiReset: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiReset'];
  apiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  clearPollTimeout(): void;
  createPollTimeout(duration: number): { duration: number };
  makeRequest: Actions<FetchIndexApiParams, FetchIndexApiResponse>['makeRequest'];
  setTimeoutId(id: NodeJS.Timeout): { id: NodeJS.Timeout };
  startPolling(indexName: string): { indexName: string };
  stopPolling(): void;
}
export interface CachedFetchIndexApiLogicValues {
  fetchIndexApiData: FetchIndexApiResponse;
  indexData: ElasticsearchIndexWithIngestion | null;
  indexName: string;
  isInitialLoading: boolean;
  isLoading: boolean;
  pollTimeoutId: NodeJS.Timeout | null;
  status: Status;
}

export const CachedFetchIndexApiLogic = kea<
  MakeLogicType<CachedFetchIndexApiLogicValues, CachedFetchIndexApiLogicActions>
>({
  actions: {
    clearPollTimeout: true,
    createPollTimeout: (duration) => ({ duration }),
    setTimeoutId: (id) => ({ id }),
    startPolling: (indexName) => ({ indexName }),
    stopPolling: true,
  },
  connect: {
    actions: [FetchIndexApiLogic, ['apiSuccess', 'apiError', 'apiReset', 'makeRequest']],
    values: [
      FetchIndexApiLogic,
      ['data as fetchIndexApiData', 'status'],
      IndexNameLogic,
      ['indexName'],
    ],
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
        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION_ON_FAILURE);
      }
    },
    apiSuccess: () => {
      if (values.pollTimeoutId) {
        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION);
      }
    },
    createPollTimeout: ({ duration }) => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        actions.makeRequest({ indexName: values.indexName });
      }, duration);
      actions.setTimeoutId(timeoutId);
    },
    startPolling: ({ indexName }) => {
      // Recurring polls are created by apiSuccess and apiError, depending on pollTimeoutId
      if (values.pollTimeoutId) {
        if (indexName === values.indexName) return;
        clearTimeout(values.pollTimeoutId);
      }
      if (indexName) {
        actions.makeRequest({ indexName });

        actions.createPollTimeout(FETCH_INDEX_POLLING_DURATION);
      }
    },
    stopPolling: () => {
      if (values.pollTimeoutId) {
        clearTimeout(values.pollTimeoutId);
      }
      actions.clearPollTimeout();
    },
  }),
  path: ['enterprise_search', 'content', 'api', 'fetch_index_api_wrapper'],
  reducers: {
    indexData: [
      null,
      {
        apiReset: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        apiSuccess: (currentState, newIndexData) => {
          return isEqual(currentState, newIndexData) ? currentState : newIndexData;
        },
      },
    ],
    pollTimeoutId: [
      null,
      {
        clearPollTimeout: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        setTimeoutId: (_, { id }) => id,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isInitialLoading: [
      () => [selectors.status, selectors.indexData],
      (
        status: CachedFetchIndexApiLogicValues['status'],
        indexData: CachedFetchIndexApiLogicValues['indexData']
      ) => {
        return status === Status.IDLE || (indexData === null && status === Status.LOADING);
      },
    ],
  }),
});
