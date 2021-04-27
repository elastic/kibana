/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { Pagination } from '@elastic/eui';
import { EventFiltersListPageState } from '../state';
import { ExceptionListItemSchema, CreateExceptionListItemSchema } from '../../../../shared_imports';
import { ServerApiError } from '../../../../common/types';
import {
  isLoadingResourceState,
  isLoadedResourceState,
  isFailedResourceState,
} from '../../../state/async_resource_state';
import { FoundExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';

export const getListItems = (state: EventFiltersListPageState): ExceptionListItemSchema[] => {
  return (isLoadedResourceState(state.listPage) && state.listPage.data.data) || [];
};

export const getListApiSuccessResponse = (
  state: EventFiltersListPageState
): FoundExceptionListItemSchema | undefined => {
  return (isLoadedResourceState(state.listPage) && state.listPage.data) || undefined;
};

export const getListPagination: (state: EventFiltersListPageState) => Pagination = createSelector(
  getListApiSuccessResponse,
  // memoized via `reselect` until the API response changes
  (response) => {
    return {
      totalItemCount: response?.total ?? 0,
      pageSize: response?.per_page ?? MANAGEMENT_PAGE_SIZE_OPTIONS[0],
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
      pageIndex: (response?.page ?? 1) - 1,
    };
  }
);

export const getListFetchError = (state: EventFiltersListPageState): ServerApiError | undefined => {
  return (isFailedResourceState(state.listPage) && state.listPage.error) || undefined;
};

export const getListIsLoading = (state: EventFiltersListPageState): boolean => {
  return isLoadedResourceState(state.listPage);
};

export const getFormEntry = (
  state: EventFiltersListPageState
): CreateExceptionListItemSchema | ExceptionListItemSchema | undefined => {
  return state.form.entry;
};

export const getFormHasError = (state: EventFiltersListPageState): boolean => {
  return state.form.hasItemsError || state.form.hasNameError;
};

export const isCreationInProgress = (state: EventFiltersListPageState): boolean => {
  return isLoadingResourceState(state.form.submissionResourceState);
};

export const isCreationSuccessful = (state: EventFiltersListPageState): boolean => {
  return isLoadedResourceState(state.form.submissionResourceState);
};

export const getCreationError = (state: EventFiltersListPageState): ServerApiError | undefined => {
  const submissionResourceState = state.form.submissionResourceState;

  return isFailedResourceState(submissionResourceState) ? submissionResourceState.error : undefined;
};
