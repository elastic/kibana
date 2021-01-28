/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { ServerApiError } from '../../../../common/types';
import { Immutable, NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';

import {
  AsyncResourceState,
  getCurrentResourceError,
  getLastLoadedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  isOutdatedResourceState,
  LoadedResourceState,
  Pagination,
  TrustedAppsListData,
  TrustedAppsListPageLocation,
  TrustedAppsListPageState,
} from '../state';

export const needsRefreshOfListData = (state: Immutable<TrustedAppsListPageState>): boolean => {
  const freshDataTimestamp = state.listView.freshDataTimestamp;
  const currentPage = state.listView.listResourceState;
  const location = state.location;

  return (
    Boolean(state.active) &&
    isOutdatedResourceState(currentPage, (data) => {
      return (
        data.pageIndex === location.page_index &&
        data.pageSize === location.page_size &&
        data.timestamp >= freshDataTimestamp
      );
    })
  );
};

export const getListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<AsyncResourceState<TrustedAppsListData>> | undefined => {
  return state.listView.listResourceState;
};

export const getLastLoadedListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<LoadedResourceState<TrustedAppsListData>> | undefined => {
  return getLastLoadedResourceState(state.listView.listResourceState);
};

export const getListItems = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedApp[]> => {
  return getLastLoadedResourceState(state.listView.listResourceState)?.data.items || [];
};

export const getCurrentLocationPageIndex = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.location.page_index;
};

export const getCurrentLocationPageSize = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.location.page_size;
};

export const getListTotalItemsCount = (state: Immutable<TrustedAppsListPageState>): number => {
  return getLastLoadedResourceState(state.listView.listResourceState)?.data.totalItemsCount || 0;
};

export const getListPagination = (state: Immutable<TrustedAppsListPageState>): Pagination => {
  const lastLoadedResourceState = getLastLoadedResourceState(state.listView.listResourceState);

  return {
    pageIndex: state.location.page_index,
    pageSize: state.location.page_size,
    totalItemCount: lastLoadedResourceState?.data.totalItemsCount || 0,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
  };
};

export const getCurrentLocation = (
  state: Immutable<TrustedAppsListPageState>
): TrustedAppsListPageLocation => state.location;

export const getListErrorMessage = (
  state: Immutable<TrustedAppsListPageState>
): string | undefined => {
  return getCurrentResourceError(state.listView.listResourceState)?.message;
};

export const isListLoading = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadingResourceState(state.listView.listResourceState);
};

export const isDeletionDialogOpen = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return state.deletionDialog.entry !== undefined;
};

export const isDeletionInProgress = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadingResourceState(state.deletionDialog.submissionResourceState);
};

export const isDeletionSuccessful = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadedResourceState(state.deletionDialog.submissionResourceState);
};

export const getDeletionError = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<ServerApiError> | undefined => {
  const submissionResourceState = state.deletionDialog.submissionResourceState;

  return isFailedResourceState(submissionResourceState) ? submissionResourceState.error : undefined;
};

export const getDeletionSubmissionResourceState = (
  state: Immutable<TrustedAppsListPageState>
): AsyncResourceState => {
  return state.deletionDialog.submissionResourceState;
};

export const getDeletionDialogEntry = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedApp> | undefined => {
  return state.deletionDialog.entry;
};

export const isCreationDialogLocation = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return state.location.show === 'create';
};

export const getCreationSubmissionResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<AsyncResourceState<TrustedApp>> => {
  return state.creationDialog.submissionResourceState;
};

export const getCreationDialogFormEntry = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<NewTrustedApp> | undefined => {
  return state.creationDialog.formState?.entry;
};

export const isCreationDialogFormValid = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return state.creationDialog.formState?.isValid || false;
};

export const isCreationInProgress = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadingResourceState(state.creationDialog.submissionResourceState);
};

export const isCreationSuccessful = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadedResourceState(state.creationDialog.submissionResourceState);
};

export const getCreationError = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<ServerApiError> | undefined => {
  const submissionResourceState = state.creationDialog.submissionResourceState;

  return isFailedResourceState(submissionResourceState) ? submissionResourceState.error : undefined;
};

export const entriesExistState: (
  state: Immutable<TrustedAppsListPageState>
) => Immutable<TrustedAppsListPageState['entriesExist']> = (state) => state.entriesExist;

export const checkingIfEntriesExist: (
  state: Immutable<TrustedAppsListPageState>
) => boolean = createSelector(entriesExistState, (doEntriesExists) => {
  return !isLoadedResourceState(doEntriesExists);
});

export const entriesExist: (state: Immutable<TrustedAppsListPageState>) => boolean = createSelector(
  entriesExistState,
  (doEntriesExists) => {
    return isLoadedResourceState(doEntriesExists) && doEntriesExists.data;
  }
);

export const trustedAppsListPageActive: (state: Immutable<TrustedAppsListPageState>) => boolean = (
  state
) => state.active;
