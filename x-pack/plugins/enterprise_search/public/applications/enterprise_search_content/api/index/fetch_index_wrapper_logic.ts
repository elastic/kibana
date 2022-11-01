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

import {
  FetchIndexApiParams,
  FetchIndexApiLogic,
  FetchIndexApiResponse,
} from './fetch_index_api_logic';

// TODO to be named better later
//
// TODO add polling
// TODO add error
//

export interface FetchIndexApiWrapperLogicActions {
  apiError: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiError'];
  apiReset: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiReset'];
  apiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  makeRequest: Actions<FetchIndexApiParams, FetchIndexApiResponse>['makeRequest']; // TODO poll/ initial load
}
export interface FetchIndexApiWrapperLogicValues {
  fetchIndexApiData: FetchIndexApiResponse;
  indexData: ElasticsearchIndexWithIngestion | null;
  isInitialLoading: boolean;
  isLoading: boolean;
  status: Status;
}

export const FetchIndexApiWrapperLogic = kea<
  MakeLogicType<FetchIndexApiWrapperLogicValues, FetchIndexApiWrapperLogicActions>
>({
  connect: {
    actions: [FetchIndexApiLogic, ['apiSuccess', 'apiError', 'apiReset', 'makeRequest']],
    values: [FetchIndexApiLogic, ['data as fetchIndexApiData', 'status']],
  },
  path: ['enterprise_search', 'content', 'api', 'fetch_index_api_wrapper'],
  reducers: {
    indexData: [
      null,
      {
        apiSuccess: (currentState, newIndexData) => {
          return isEqual(currentState, newIndexData) ? currentState : newIndexData;
        },
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isInitialLoading: [
      () => [selectors.status, selectors.indexData],
      (
        status: FetchIndexApiWrapperLogicValues['status'],
        indexData: FetchIndexApiWrapperLogicValues['indexData']
      ) => {
        return status === Status.IDLE || (indexData === null && status === Status.LOADING);
      },
    ],
  }),
});
