/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import { Pagination } from '@elastic/eui';

import type {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EventFiltersListPageState, EventFiltersServiceGetListOptions } from '../types';

import { ServerApiError } from '../../../../common/types';
import {
  isLoadingResourceState,
  isLoadedResourceState,
  isFailedResourceState,
  isUninitialisedResourceState,
  getLastLoadedResourceState,
} from '../../../state/async_resource_state';
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
  return getLastLoadedResourceState(listPageData)?.data.content;
});

export const getListItems: EventFiltersSelector<Immutable<ExceptionListItemSchema[]>> =
  createSelector(getListApiSuccessResponse, (apiResponseData) => {
    return apiResponseData?.data || [];
  });

export const getTotalCountListItems: EventFiltersSelector<Immutable<number>> = createSelector(
  getListApiSuccessResponse,
  (apiResponseData) => {
    return apiResponseData?.total || 0;
  }
);

/**
 * Will return the query that was used with the currently displayed list of content. If a new page
 * of content is being loaded, this selector will then attempt to use the previousState to return
 * the query used.
 */
export const getCurrentListItemsQuery: EventFiltersSelector<EventFiltersServiceGetListOptions> =
  createSelector(getCurrentListPageDataState, (pageDataState) => {
    return getLastLoadedResourceState(pageDataState)?.data.query ?? {};
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

export const getListFetchError: EventFiltersSelector<Immutable<ServerApiError> | undefined> =
  createSelector(getCurrentListPageDataState, (listPageDataState) => {
    return (isFailedResourceState(listPageDataState) && listPageDataState.error) || undefined;
  });

export const getListPageDataExistsState: EventFiltersSelector<
  StoreState['listPage']['dataExist']
> = ({ listPage: { dataExist } }) => dataExist;

export const getListIsLoading: EventFiltersSelector<boolean> = createSelector(
  getCurrentListPageDataState,
  getListPageDataExistsState,
  (listDataState, dataExists) =>
    isLoadingResourceState(listDataState) || isLoadingResourceState(dataExists)
);

export const getListPageDoesDataExist: EventFiltersSelector<boolean> = createSelector(
  getListPageDataExistsState,
  (dataExistsState) => {
    return !!getLastLoadedResourceState(dataExistsState)?.data;
  }
);

export const getFormEntryState: EventFiltersSelector<StoreState['form']['entry']> = (state) => {
  return state.form.entry;
};
// Needed for form component as we modify the existing entry on exceptuionBuilder component
export const getFormEntryStateMutable = (
  state: EventFiltersListPageState
): EventFiltersListPageState['form']['entry'] => {
  return state.form.entry;
};

export const getFormEntry = createSelector(getFormEntryState, (entry) => entry);

export const getNewCommentState: EventFiltersSelector<StoreState['form']['newComment']> = (
  state
) => {
  return state.form.newComment;
};

export const getNewComment = createSelector(getNewCommentState, (newComment) => newComment);

export const getHasNameError = (state: EventFiltersListPageState): boolean => {
  return state.form.hasNameError;
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

export const isUninitialisedForm = (state: EventFiltersListPageState): boolean => {
  return isUninitialisedResourceState(state.form.submissionResourceState);
};

export const getActionError = (state: EventFiltersListPageState): ServerApiError | undefined => {
  const submissionResourceState = state.form.submissionResourceState;

  return isFailedResourceState(submissionResourceState) ? submissionResourceState.error : undefined;
};

export const getSubmissionResourceState: EventFiltersSelector<
  StoreState['form']['submissionResourceState']
> = (state) => {
  return state.form.submissionResourceState;
};

export const getSubmissionResource = createSelector(
  getSubmissionResourceState,
  (submissionResourceState) => submissionResourceState
);

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

export const getDeletionState = createSelector(
  getCurrentListPageState,
  (listState) => listState.deletion
);

export const showDeleteModal: EventFiltersSelector<boolean> = createSelector(
  getDeletionState,
  ({ item }) => {
    return Boolean(item);
  }
);

export const getItemToDelete: EventFiltersSelector<StoreState['listPage']['deletion']['item']> =
  createSelector(getDeletionState, ({ item }) => item);

export const isDeletionInProgress: EventFiltersSelector<boolean> = createSelector(
  getDeletionState,
  ({ status }) => {
    return isLoadingResourceState(status);
  }
);

export const wasDeletionSuccessful: EventFiltersSelector<boolean> = createSelector(
  getDeletionState,
  ({ status }) => {
    return isLoadedResourceState(status);
  }
);

export const getDeleteError: EventFiltersSelector<ServerApiError | undefined> = createSelector(
  getDeletionState,
  ({ status }) => {
    if (isFailedResourceState(status)) {
      return status.error;
    }
  }
);
