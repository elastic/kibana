/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { Status } from '../../../../../common/types/api';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  FetchAnalyticsCollectionsAPILogic,
  FetchAnalyticsCollectionsApiLogicResponse,
} from '../../api/index/fetch_analytics_collections_api_logic';

export interface AnalyticsCollectionsActions {
  fetchAnalyticsCollections({ query }: { query: string }): { query: string };
  makeRequest: Actions<{}, FetchAnalyticsCollectionsApiLogicResponse>['makeRequest'];
}
export interface AnalyticsCollectionsValues {
  analyticsCollections: AnalyticsCollection[];
  data: typeof FetchAnalyticsCollectionsAPILogic.values.data;
  hasNoAnalyticsCollections: boolean;
  isFirstRequest: boolean;
  isLoading: boolean;
  status: Status;
}

export const AnalyticsCollectionsLogic = kea<
  MakeLogicType<AnalyticsCollectionsValues, AnalyticsCollectionsActions>
>({
  actions: {
    fetchAnalyticsCollections: ({ query }) => ({
      query,
    }),
    setIsFirstRequest: true,
  },
  connect: {
    actions: [FetchAnalyticsCollectionsAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchAnalyticsCollectionsAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    fetchAnalyticsCollections: async ({ query }, breakpoint) => {
      if (query) {
        await breakpoint(200);
      }
      actions.makeRequest({ query });
    },
  }),
  path: ['enterprise_search', 'analytics', 'collections'],
  reducers: {
    isFirstRequest: [
      true,
      {
        apiError: () => false,
        apiSuccess: () => false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    analyticsCollections: [() => [selectors.data], (data) => data || []],
    hasNoAnalyticsCollections: [
      () => [selectors.data, selectors.isFirstRequest],
      (data, isFirstRequest) => data?.length === 0 && isFirstRequest,
    ],
    isLoading: [
      () => [selectors.status, selectors.isFirstRequest],
      (status, isFirstRequest) => [Status.LOADING, Status.IDLE].includes(status) && isFirstRequest,
    ],
  }),
});
