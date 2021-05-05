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
import { EventFiltersServiceGetListOptions } from '../types';

type StoreState = Immutable<EventFiltersListPageState>;
type EventFiltersSelector<T> = (state: StoreState) => T;

export const getCurrentListPageState: EventFiltersSelector<StoreState['listPage']> = (state) => {
  return state.listPage;
};

export const getListPageIsActive: EventFiltersSelector<boolean> = createSelector(
  getCurrentListPageState,
  (listPage) => listPage.active
);

export const getCurrentListPageDataState: EventFiltersSelector<StoreState['listPage']['data']> = (
  state
) => state.listPage.data;

/**
 * Will return the API response with event filters. If the current state is attempting to load a new
 * page of content, then return the previous API response if we have one
 */
export const getListApiSuccessResponse: EventFiltersSelector<
  Immutable<FoundExceptionListItemSchema> | undefined
> = createSelector(getCurrentListPageDataState, (listPageData) => {
  if (isLoadedResourceState(listPageData)) {
    return listPageData.data.content;
  } else if (
    isLoadingResourceState(listPageData) &&
    isLoadedResourceState(listPageData.previousState)
  ) {
    return listPageData.previousState.data.content;
  }
  return undefined;
});

export const getListItems: EventFiltersSelector<
  Immutable<ExceptionListItemSchema[]>
> = createSelector(getListApiSuccessResponse, (apiResponseData) => {
  return apiResponseData?.data || [];
});

/**
 * Will return the query that was used with the currently displayed list of content. If a new page
 * of content is being loaded, this selector will then attempt to use the previousState to return
 * the query used.
 */
export const getCurrentListItemsQuery: EventFiltersSelector<EventFiltersServiceGetListOptions> = createSelector(
  getCurrentListPageDataState,
  (pageDataState) => {
    return (
      (isLoadedResourceState(pageDataState) && pageDataState.data.query) ||
      (isLoadingResourceState(pageDataState) &&
        isLoadedResourceState(pageDataState.previousState) &&
        pageDataState.previousState.data.query) ||
      {}
    );
  }
);

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

export const getListFetchError: EventFiltersSelector<
  Immutable<ServerApiError> | undefined
> = createSelector(getCurrentListPageDataState, (listPageDataState) => {
  return (isFailedResourceState(listPageDataState) && listPageDataState.error) || undefined;
});

export const getListIsLoading: EventFiltersSelector<boolean> = createSelector(
  getCurrentListPageDataState,
  (listDataState) => isLoadingResourceState(listDataState)
);

export const getListPageDataExistsState: EventFiltersSelector<
  StoreState['listPage']['dataExist']
> = ({ listPage: { dataExist } }) => dataExist;

export const getListPageDoesDataExist: EventFiltersSelector<boolean> = createSelector(
  getListPageDataExistsState,
  (dataExistsState) => {
    if (isLoadedResourceState(dataExistsState)) {
      return dataExistsState.data;
    }

    // Until we know for sure that data exists (LoadedState), we assume `true`
    return true;
  }
);

export const getFormEntry = (
  state: EventFiltersListPageState
): CreateExceptionListItemSchema | ExceptionListItemSchema | undefined => {
  return state.form.entry;
};

export const getFormHasError = (state: EventFiltersListPageState): boolean => {
  return state.form.hasItemsError || state.form.hasNameError || state.form.hasOSError;
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

export const getCurrentLocation: EventFiltersSelector<StoreState['location']> = (state) =>
  state.location;

/** Compares the URL param values to the values used in the last data query */
export const listDataNeedsRefresh: EventFiltersSelector<boolean> = createSelector(
  getCurrentLocation,
  getCurrentListItemsQuery,
  (state) => state.listPage.forceRefresh,
  (location, currentQuery, forceRefresh) => {
    return (
      forceRefresh ||
      location.page_index + 1 !== currentQuery.page ||
      location.page_size !== currentQuery.perPage
    );
  }
);
