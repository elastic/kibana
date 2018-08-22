/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { createGraphqlStateSelectors } from '../../../utils/remote_state/remote_graphql_state';
import { LogEntriesRemoteState } from './state';

const entriesGraphlStateSelectors = createGraphqlStateSelectors<LogEntriesRemoteState>();

export const selectEntries = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.entries : [])
);

export const selectIsLoadingEntries = entriesGraphlStateSelectors.selectIsLoading;

export const selectIsReloadingEntries = createSelector(
  entriesGraphlStateSelectors.selectIsLoading,
  entriesGraphlStateSelectors.selectLoadingProgressOperationInfo,
  (isLoading, operationInfo) =>
    isLoading && operationInfo ? operationInfo.operationKey === 'load' : false
);

export const selectIsLoadingMoreEntries = createSelector(
  entriesGraphlStateSelectors.selectIsLoading,
  entriesGraphlStateSelectors.selectLoadingProgressOperationInfo,
  (isLoading, operationInfo) =>
    isLoading && operationInfo ? operationInfo.operationKey === 'load_more' : false
);

export const selectEntriesStart = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data && data.start ? data.start : null)
);

export const selectEntriesEnd = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data && data.end ? data.end : null)
);

export const selectHasMoreBeforeStart = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.hasMoreBefore : true)
);

export const selectHasMoreAfterEnd = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.hasMoreAfter : true)
);

export const selectEntriesLastLoadedTime = entriesGraphlStateSelectors.selectLoadingResultTime;

export const selectEntriesStartLoadingState = entriesGraphlStateSelectors.selectLoadingState;

export const selectEntriesEndLoadingState = entriesGraphlStateSelectors.selectLoadingState;

export const selectFirstEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[0] : null)
);

export const selectLastEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[entries.length - 1] : null)
);

export const selectLoadedEntriesTimeInterval = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => ({
    end: data && data.end ? data.end.time : null,
    start: data && data.start ? data.start.time : null,
  })
);
