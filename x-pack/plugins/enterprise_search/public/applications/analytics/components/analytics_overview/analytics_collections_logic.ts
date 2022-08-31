/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';
import { flashAPIErrors, clearFlashMessages } from '../../../shared/flash_messages';
import { FetchAnalyticsCollectionsAPILogic } from '../../api/index/fetch_analytics_collections_api_logic';

export interface AnalyticsCollectionsActions {
  apiError(error: HttpError): HttpError;
  apiSuccess(collections: AnalyticsCollection[]): AnalyticsCollection[];
  fetchAnalyticsCollections(): void;
  makeRequest: typeof FetchAnalyticsCollectionsAPILogic.actions.makeRequest;
}
export interface AnalyticsCollectionsValues {
  analyticsCollections: AnalyticsCollection[];
  data: typeof FetchAnalyticsCollectionsAPILogic.values.data;
  hasNoAnalyticsCollections: boolean;
  isLoading: boolean;
  status: typeof FetchAnalyticsCollectionsAPILogic.values.status;
}

export const AnalyticsCollectionsLogic = kea<
  MakeLogicType<AnalyticsCollectionsValues, AnalyticsCollectionsActions>
>({
  actions: {
    fetchAnalyticsCollections: () => {},
  },
  connect: {
    actions: [FetchAnalyticsCollectionsAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [FetchAnalyticsCollectionsAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    apiError: (e) => flashAPIErrors(e),
    fetchAnalyticsCollections: () => {
      actions.makeRequest({});
    },
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'analytics', 'collections'],
  selectors: ({ selectors }) => ({
    analyticsCollections: [() => [selectors.data], (data) => data || []],
    hasNoAnalyticsCollections: [() => [selectors.data], (data) => data?.length === 0],
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
  }),
});
