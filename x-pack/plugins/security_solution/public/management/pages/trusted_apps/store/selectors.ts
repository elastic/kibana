/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { ServerApiError } from '../../../../common/types';
import { Immutable, NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types';

import {
  AsyncResourceState,
  getCurrentResourceError,
  getLastLoadedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  isOutdatedResourceState,
  LoadedResourceState,
  PaginationInfo,
  TrustedAppCreateFailure,
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state';
import { TrustedAppsUrlParams } from '../types';
import {
  isTrustedAppCreateFailureState,
  isTrustedAppCreatePendingState,
  isTrustedAppCreateSuccessState,
} from '../state/type_guards';

const pageInfosEqual = (pageInfo1: PaginationInfo, pageInfo2: PaginationInfo): boolean =>
  pageInfo1.index === pageInfo2.index && pageInfo1.size === pageInfo2.size;

export const needsRefreshOfListData = (state: Immutable<TrustedAppsListPageState>): boolean => {
  const currentPageInfo = state.listView.currentPaginationInfo;
  const currentPage = state.listView.currentListResourceState;
  const freshDataTimestamp = state.listView.freshDataTimestamp;

  return (
    state.active &&
    isOutdatedResourceState(currentPage, (data) => {
      return (
        pageInfosEqual(currentPageInfo, data.paginationInfo) && data.timestamp >= freshDataTimestamp
      );
    })
  );
};

export const getCurrentListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<AsyncResourceState<TrustedAppsListData>> | undefined => {
  return state.listView.currentListResourceState;
};

export const getLastLoadedListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<LoadedResourceState<TrustedAppsListData>> | undefined => {
  return getLastLoadedResourceState(state.listView.currentListResourceState);
};

export const getListItems = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedApp[]> => {
  return getLastLoadedResourceState(state.listView.currentListResourceState)?.data.items || [];
};

export const getListCurrentPageIndex = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.index;
};

export const getListCurrentPageSize = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.size;
};

export const getListTotalItemsCount = (state: Immutable<TrustedAppsListPageState>): number => {
  return (
    getLastLoadedResourceState(state.listView.currentListResourceState)?.data.totalItemsCount || 0
  );
};

export const getListCurrentShowValue: (
  state: Immutable<TrustedAppsListPageState>
) => TrustedAppsListPageState['listView']['show'] = (state) => {
  return state.listView.show;
};

export const getListUrlSearchParams: (
  state: Immutable<TrustedAppsListPageState>
) => TrustedAppsUrlParams = createSelector(
  getListCurrentPageIndex,
  getListCurrentPageSize,
  getListCurrentShowValue,
  (pageIndex, pageSize, showValue) => {
    return {
      page_index: pageIndex,
      page_size: pageSize,
      show: showValue,
    };
  }
);

export const getListErrorMessage = (
  state: Immutable<TrustedAppsListPageState>
): string | undefined => {
  return getCurrentResourceError(state.listView.currentListResourceState)?.message;
};

export const isListLoading = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadingResourceState(state.listView.currentListResourceState);
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

export const isCreatePending: (state: Immutable<TrustedAppsListPageState>) => boolean = ({
  createView,
}) => {
  return isTrustedAppCreatePendingState(createView);
};

export const getTrustedAppCreateData: (
  state: Immutable<TrustedAppsListPageState>
) => undefined | Immutable<NewTrustedApp> = ({ createView }) => {
  return (isTrustedAppCreatePendingState(createView) && createView.data) || undefined;
};

export const getApiCreateErrors: (
  state: Immutable<TrustedAppsListPageState>
) => undefined | TrustedAppCreateFailure['data'] = ({ createView }) => {
  return (isTrustedAppCreateFailureState(createView) && createView.data) || undefined;
};

export const wasCreateSuccessful: (state: Immutable<TrustedAppsListPageState>) => boolean = ({
  createView,
}) => {
  return isTrustedAppCreateSuccessState(createView);
};
