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
import { FetchAnalyticsCollectionAPILogic } from '../../api/fetch_analytics_collection/fetch_analytics_collection_api_logic';

export interface FetchAnalyticsCollectionActions {
  apiError(error: HttpError): HttpError;
  apiSuccess(collection: AnalyticsCollection): AnalyticsCollection;
  fetchAnalyticsCollection(name: string): AnalyticsCollection;
  makeRequest: typeof FetchAnalyticsCollectionAPILogic.actions.makeRequest;
}
export interface FetchAnalyticsCollectionValues {
  analyticsCollection: AnalyticsCollection;
  data: typeof FetchAnalyticsCollectionAPILogic.values.data;
  hasNoAnalyticsCollection: boolean;
  isLoading: boolean;
  status: typeof FetchAnalyticsCollectionAPILogic.values.status;
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
    analyticsCollection: [() => [selectors.data], (data) => data || {}],
    hasNoAnalyticsCollection: [
      () => [selectors.data],
      (data) => typeof data === 'undefined' || Object.keys(data).length === 0,
    ],
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
  }),
});
