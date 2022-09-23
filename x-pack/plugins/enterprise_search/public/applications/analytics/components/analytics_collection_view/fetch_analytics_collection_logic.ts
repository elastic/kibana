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
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import {
  FetchAnalyticsCollectionAPILogic,
  FetchAnalyticsCollectionApiLogicResponse,
} from '../../api/fetch_analytics_collection/fetch_analytics_collection_api_logic';

export interface FetchAnalyticsCollectionActions {
  apiError: Actions<{}, FetchAnalyticsCollectionApiLogicResponse>['apiError'];
  apiSuccess: Actions<{}, FetchAnalyticsCollectionApiLogicResponse>['apiSuccess'];
  fetchAnalyticsCollection(name: string): AnalyticsCollection;
  makeRequest: Actions<{}, FetchAnalyticsCollectionApiLogicResponse>['makeRequest'];
}
export interface FetchAnalyticsCollectionValues {
  analyticsCollection: AnalyticsCollection;
  data: typeof FetchAnalyticsCollectionAPILogic.values.data;
  isLoading: boolean;
  status: Status;
}

export const FetchAnalyticsCollectionLogic = kea<
  MakeLogicType<FetchAnalyticsCollectionValues, FetchAnalyticsCollectionActions>
>({
  actions: {
    fetchAnalyticsCollection: (name) => ({ name }),
  },
  connect: {
    actions: [FetchAnalyticsCollectionAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchAnalyticsCollectionAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    apiError: (e) => flashAPIErrors(e),
    fetchAnalyticsCollection: ({ name }) => {
      actions.makeRequest({ name });
    },
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'analytics', 'collection'],
  selectors: ({ selectors }) => ({
    analyticsCollection: [() => [selectors.data], (data) => data || null],
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
  }),
});
