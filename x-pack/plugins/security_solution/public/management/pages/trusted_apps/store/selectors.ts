/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { ServerApiError } from '../../../../common/types';
import {
  Immutable,
  NewTrustedApp,
  PolicyData,
  TrustedApp,
} from '../../../../../common/endpoint/types';
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
import { GetPolicyListResponse } from '../../policy/types';

export const needsRefreshOfListData = (state: Immutable<TrustedAppsListPageState>): boolean => {
  const freshDataTimestamp = state.listView.freshDataTimestamp;
  const currentPage = state.listView.listResourceState;
  const location = state.location;
  const forceRefresh = state.forceRefresh;
  return (
    Boolean(state.active) &&
    (forceRefresh ||
      isOutdatedResourceState(currentPage, (data) => {
        return (
          data.pageIndex === location.page_index &&
          data.pageSize === location.page_size &&
          data.timestamp >= freshDataTimestamp
        );
      }))
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

export const getCurrentLocationFilter = (state: Immutable<TrustedAppsListPageState>): string => {
  return state.location.filter;
};

export const getCurrentLocationIncludedPolicies = (
  state: Immutable<TrustedAppsListPageState>
): string => {
  return state.location.included_policies;
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
  return !!state.location.show;
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

export const checkingIfEntriesExist: (state: Immutable<TrustedAppsListPageState>) => boolean =
  createSelector(entriesExistState, (doEntriesExists) => {
    return !isLoadedResourceState(doEntriesExists);
  });

export const entriesExist: (state: Immutable<TrustedAppsListPageState>) => boolean = createSelector(
  entriesExistState,
  (doEntriesExists) => {
    return isLoadedResourceState(doEntriesExists) && doEntriesExists.data;
  }
);

export const prevEntriesExist: (state: Immutable<TrustedAppsListPageState>) => boolean =
  createSelector(entriesExistState, (doEntriesExists) => {
    return (
      isLoadingResourceState(doEntriesExists) && !!getLastLoadedResourceState(doEntriesExists)?.data
    );
  });

export const trustedAppsListPageActive: (state: Immutable<TrustedAppsListPageState>) => boolean = (
  state
) => state.active;

export const policiesState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedAppsListPageState['policies']> => state.policies;

export const loadingPolicies: (state: Immutable<TrustedAppsListPageState>) => boolean =
  createSelector(policiesState, (policies) => isLoadingResourceState(policies));

export const listOfPolicies: (
  state: Immutable<TrustedAppsListPageState>
) => Immutable<GetPolicyListResponse['items']> = createSelector(policiesState, (policies) => {
  return isLoadedResourceState(policies) ? policies.data.items : [];
});

export const isLoadingListOfPolicies: (state: Immutable<TrustedAppsListPageState>) => boolean =
  createSelector(policiesState, (policies) => {
    return isLoadingResourceState(policies);
  });

export const getMapOfPoliciesById: (
  state: Immutable<TrustedAppsListPageState>
) => Immutable<Record<string, Immutable<PolicyData>>> = createSelector(
  listOfPolicies,
  (policies) => {
    return policies.reduce<Record<string, Immutable<PolicyData>>>((mapById, policy) => {
      mapById[policy.id] = policy;
      return mapById;
    }, {}) as Immutable<Record<string, Immutable<PolicyData>>>;
  }
);

export const isEdit: (state: Immutable<TrustedAppsListPageState>) => boolean = createSelector(
  getCurrentLocation,
  ({ show }) => {
    return show === 'edit';
  }
);

export const editItemId: (state: Immutable<TrustedAppsListPageState>) => string | undefined =
  createSelector(getCurrentLocation, ({ id }) => {
    return id;
  });

export const editItemState: (
  state: Immutable<TrustedAppsListPageState>
) => Immutable<TrustedAppsListPageState>['creationDialog']['editItem'] = (state) => {
  return state.creationDialog.editItem;
};

export const isFetchingEditTrustedAppItem: (state: Immutable<TrustedAppsListPageState>) => boolean =
  createSelector(editItemState, (editTrustedAppState) => {
    return editTrustedAppState ? isLoadingResourceState(editTrustedAppState) : false;
  });

export const editTrustedAppFetchError: (
  state: Immutable<TrustedAppsListPageState>
) => ServerApiError | undefined = createSelector(editItemState, (itemForEditState) => {
  return itemForEditState && getCurrentResourceError(itemForEditState);
});

export const editingTrustedApp: (
  state: Immutable<TrustedAppsListPageState>
) => undefined | Immutable<TrustedApp> = createSelector(editItemState, (editTrustedAppState) => {
  if (editTrustedAppState && isLoadedResourceState(editTrustedAppState)) {
    return editTrustedAppState.data;
  }
});
