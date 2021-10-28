/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pagination } from '@elastic/eui';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/endpoint/types';
import { ServerApiError } from '../../../../common/types';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';
import {
  getLastLoadedResourceState,
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../state/async_resource_state';
import { HostIsolationExceptionsPageState } from '../types';

type StoreState = Immutable<HostIsolationExceptionsPageState>;
type HostIsolationExceptionsSelector<T> = (state: StoreState) => T;

export const getCurrentListPageState: HostIsolationExceptionsSelector<StoreState> = (state) => {
  return state;
};

export const getCurrentListPageDataState: HostIsolationExceptionsSelector<StoreState['entries']> = (
  state
) => state.entries;

const getListApiSuccessResponse: HostIsolationExceptionsSelector<
  Immutable<FoundExceptionListItemSchema> | undefined
> = createSelector(getCurrentListPageDataState, (listPageData) => {
  return getLastLoadedResourceState(listPageData)?.data;
});

export const getListItems: HostIsolationExceptionsSelector<Immutable<ExceptionListItemSchema[]>> =
  createSelector(getListApiSuccessResponse, (apiResponseData) => {
    return apiResponseData?.data || [];
  });

export const getTotalListItems: HostIsolationExceptionsSelector<Immutable<number>> = createSelector(
  getListApiSuccessResponse,
  (apiResponseData) => {
    return apiResponseData?.total || 0;
  }
);

export const getListPagination: HostIsolationExceptionsSelector<Pagination> = createSelector(
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

export const getListIsLoading: HostIsolationExceptionsSelector<boolean> = createSelector(
  getCurrentListPageDataState,
  (listDataState) => isLoadingResourceState(listDataState)
);

export const getListFetchError: HostIsolationExceptionsSelector<
  Immutable<ServerApiError> | undefined
> = createSelector(getCurrentListPageDataState, (listPageDataState) => {
  return (isFailedResourceState(listPageDataState) && listPageDataState.error) || undefined;
});

export const getCurrentLocation: HostIsolationExceptionsSelector<StoreState['location']> = (
  state
) => state.location;

export const getDeletionState: HostIsolationExceptionsSelector<StoreState['deletion']> =
  createSelector(getCurrentListPageState, (listState) => listState.deletion);

export const showDeleteModal: HostIsolationExceptionsSelector<boolean> = createSelector(
  getDeletionState,
  ({ item }) => {
    return Boolean(item);
  }
);

export const getItemToDelete: HostIsolationExceptionsSelector<StoreState['deletion']['item']> =
  createSelector(getDeletionState, ({ item }) => item);

export const isDeletionInProgress: HostIsolationExceptionsSelector<boolean> = createSelector(
  getDeletionState,
  ({ status }) => {
    return isLoadingResourceState(status);
  }
);

export const wasDeletionSuccessful: HostIsolationExceptionsSelector<boolean> = createSelector(
  getDeletionState,
  ({ status }) => {
    return isLoadedResourceState(status);
  }
);

export const getDeleteError: HostIsolationExceptionsSelector<ServerApiError | undefined> =
  createSelector(getDeletionState, ({ status }) => {
    if (isFailedResourceState(status)) {
      return status.error;
    }
  });

const getFormState: HostIsolationExceptionsSelector<StoreState['form']> = (state) => {
  return state.form;
};

export const getFormStatusFailure: HostIsolationExceptionsSelector<ServerApiError | undefined> =
  createSelector(getFormState, (form) => {
    if (isFailedResourceState(form.status)) {
      return form.status.error;
    }
  });

export const getExceptionToEdit: HostIsolationExceptionsSelector<
  UpdateExceptionListItemSchema | undefined
> = (state) => (state.form.entry ? (state.form.entry as UpdateExceptionListItemSchema) : undefined);
