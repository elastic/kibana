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
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';
import { Immutable } from '../../../../../common/endpoint/types';

type StoreState = Immutable<EventFiltersListPageState>;
type EventFiltersSelector<T> = (state: StoreState) => T;

export const getCurrentListPageState: EventFiltersSelector<StoreState['listPage']> = (state) => {
  return state.listPage;
};

export const getListItems: EventFiltersSelector<
  Immutable<ExceptionListItemSchema[]>
> = createSelector(getCurrentListPageState, (listPageState) => {
  return (isLoadedResourceState(listPageState) && listPageState.data.data) || [];
});

export const getListApiSuccessResponse: EventFiltersSelector<
  Immutable<FoundExceptionListItemSchema> | undefined
> = createSelector(getCurrentListPageState, (listPageState) => {
  return (isLoadedResourceState(listPageState) && listPageState.data) || undefined;
});

export const getListPagination: EventFiltersSelector<Pagination> = createSelector(
  getListApiSuccessResponse,
  // memoized via `reselect` until the API response changes
  (response) => {
    return {
      totalItemCount: response?.total ?? 0,
      pageSize: response?.per_page ?? MANAGEMENT_DEFAULT_PAGE_SIZE,
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
      pageIndex: (response?.page ?? 1) - 1,
    };
  }
);

export const listDataNeedsRefresh: EventFiltersSelector<boolean> = (state) => {
  // FIXME:PT implement this selector
  return true;
};

export const getListFetchError: EventFiltersSelector<
  Immutable<ServerApiError> | undefined
> = createSelector(getCurrentListPageState, (listPageState) => {
  return (isFailedResourceState(listPageState) && listPageState.error) || undefined;
});

export const getListIsLoading: EventFiltersSelector<boolean> = (state) => {
  return isLoadingResourceState(state.listPage);
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
