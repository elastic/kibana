/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Immutable,
  PostTrustedAppCreateRequest,
  TrustedApp,
} from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import {
  ImmutableMiddleware,
  ImmutableMiddlewareAPI,
  ImmutableMiddlewareFactory,
} from '../../../../common/store';

import { TrustedAppsHttpService, TrustedAppsService } from '../service';

import {
  AsyncResourceState,
  getLastLoadedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  isStaleResourceState,
  isUninitialisedResourceState,
  StaleResourceState,
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state';

import { defaultNewTrustedApp } from './builders';

import {
  TrustedAppCreationSubmissionResourceStateChanged,
  TrustedAppDeletionSubmissionResourceStateChanged,
  TrustedAppsListResourceStateChanged,
} from './action';

import {
  getListResourceState,
  getDeletionDialogEntry,
  getDeletionSubmissionResourceState,
  getLastLoadedListResourceState,
  getCurrentLocationPageIndex,
  getCurrentLocationPageSize,
  getCurrentLocationFilter,
  needsRefreshOfListData,
  getCreationSubmissionResourceState,
  getCreationDialogFormEntry,
  isCreationDialogLocation,
  isCreationDialogFormValid,
  entriesExist,
  getListTotalItemsCount,
  trustedAppsListPageActive,
  entriesExistState,
  policiesState,
  isEdit,
  isFetchingEditTrustedAppItem,
  editItemId,
  editingTrustedApp,
  getListItems,
  getCurrentLocationIncludedPolicies,
} from './selectors';
import { parsePoliciesToKQL, parseQueryFilterToKQL } from '../../../common/utils';
import { toUpdateTrustedApp } from '../../../../../common/endpoint/service/trusted_apps/to_update_trusted_app';
import { SEARCHABLE_FIELDS } from '../constants';

const createTrustedAppsListResourceStateChangedAction = (
  newState: Immutable<AsyncResourceState<TrustedAppsListData>>
): Immutable<TrustedAppsListResourceStateChanged> => ({
  type: 'trustedAppsListResourceStateChanged',
  payload: { newState },
});

const refreshListIfNeeded = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  if (needsRefreshOfListData(store.getState())) {
    store.dispatch({ type: 'trustedAppForceRefresh', payload: { forceRefresh: false } });
    store.dispatch(
      createTrustedAppsListResourceStateChangedAction({
        type: 'LoadingResourceState',
        // need to think on how to avoid the casting
        previousState: getListResourceState(store.getState()) as Immutable<
          StaleResourceState<TrustedAppsListData>
        >,
      })
    );

    try {
      const pageIndex = getCurrentLocationPageIndex(store.getState());
      const pageSize = getCurrentLocationPageSize(store.getState());
      const filter = getCurrentLocationFilter(store.getState());
      const includedPolicies = getCurrentLocationIncludedPolicies(store.getState());

      const kuery = [];

      const filterKuery = parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) || undefined;
      if (filterKuery) kuery.push(filterKuery);

      const policiesKuery =
        parsePoliciesToKQL(includedPolicies ? includedPolicies.split(',') : []) || undefined;
      if (policiesKuery) kuery.push(policiesKuery);

      const response = await trustedAppsService.getTrustedAppsList({
        page: pageIndex + 1,
        per_page: pageSize,
        kuery: kuery.join(' AND ') || undefined,
      });

      store.dispatch(
        createTrustedAppsListResourceStateChangedAction({
          type: 'LoadedResourceState',
          data: {
            items: response.data,
            pageIndex,
            pageSize,
            totalItemsCount: response.total,
            timestamp: Date.now(),
            filter,
            includedPolicies,
          },
        })
      );
    } catch (error) {
      store.dispatch(
        createTrustedAppsListResourceStateChangedAction({
          type: 'FailedResourceState',
          error: error.body,
          lastLoadedState: getLastLoadedListResourceState(store.getState()),
        })
      );
    }
  }
};

const updateCreationDialogIfNeeded = (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>
) => {
  const newEntry = getCreationDialogFormEntry(store.getState());
  const shouldShow = isCreationDialogLocation(store.getState());

  if (shouldShow && !newEntry) {
    store.dispatch({
      type: 'trustedAppCreationDialogStarted',
      payload: { entry: defaultNewTrustedApp() },
    });
  } else if (!shouldShow && newEntry) {
    store.dispatch({
      type: 'trustedAppCreationDialogClosed',
    });
  }
};

const createTrustedAppCreationSubmissionResourceStateChanged = (
  newState: Immutable<AsyncResourceState<TrustedApp>>
): Immutable<TrustedAppCreationSubmissionResourceStateChanged> => ({
  type: 'trustedAppCreationSubmissionResourceStateChanged',
  payload: { newState },
});

const submitCreationIfNeeded = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const currentState = store.getState();
  const submissionResourceState = getCreationSubmissionResourceState(currentState);
  const isValid = isCreationDialogFormValid(currentState);
  const entry = getCreationDialogFormEntry(currentState);
  const editMode = isEdit(currentState);

  if (isStaleResourceState(submissionResourceState) && entry !== undefined && isValid) {
    store.dispatch(
      createTrustedAppCreationSubmissionResourceStateChanged({
        type: 'LoadingResourceState',
        previousState: submissionResourceState,
      })
    );

    try {
      let responseTrustedApp: TrustedApp;

      if (editMode) {
        responseTrustedApp = (
          await trustedAppsService.updateTrustedApp(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            { id: editItemId(currentState)! },
            // TODO: try to remove the cast
            entry as PostTrustedAppCreateRequest
          )
        ).data;
      } else {
        // TODO: try to remove the cast
        responseTrustedApp = (
          await trustedAppsService.createTrustedApp(entry as PostTrustedAppCreateRequest)
        ).data;
      }

      store.dispatch(
        createTrustedAppCreationSubmissionResourceStateChanged({
          type: 'LoadedResourceState',
          data: responseTrustedApp,
        })
      );
      store.dispatch({
        type: 'trustedAppsListDataOutdated',
      });
    } catch (error) {
      store.dispatch(
        createTrustedAppCreationSubmissionResourceStateChanged({
          type: 'FailedResourceState',
          error: error.body,
          lastLoadedState: getLastLoadedResourceState(submissionResourceState),
        })
      );
    }
  }
};

const createTrustedAppDeletionSubmissionResourceStateChanged = (
  newState: Immutable<AsyncResourceState>
): Immutable<TrustedAppDeletionSubmissionResourceStateChanged> => ({
  type: 'trustedAppDeletionSubmissionResourceStateChanged',
  payload: { newState },
});

const submitDeletionIfNeeded = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const submissionResourceState = getDeletionSubmissionResourceState(store.getState());
  const entry = getDeletionDialogEntry(store.getState());

  if (isStaleResourceState(submissionResourceState) && entry !== undefined) {
    store.dispatch(
      createTrustedAppDeletionSubmissionResourceStateChanged({
        type: 'LoadingResourceState',
        previousState: submissionResourceState,
      })
    );

    try {
      await trustedAppsService.deleteTrustedApp({ id: entry.id });

      store.dispatch(
        createTrustedAppDeletionSubmissionResourceStateChanged({
          type: 'LoadedResourceState',
          data: null,
        })
      );
      store.dispatch({
        type: 'trustedAppDeletionDialogClosed',
      });
      store.dispatch({
        type: 'trustedAppsListDataOutdated',
      });
    } catch (error) {
      store.dispatch(
        createTrustedAppDeletionSubmissionResourceStateChanged({
          type: 'FailedResourceState',
          error: error.body,
          lastLoadedState: getLastLoadedResourceState(submissionResourceState),
        })
      );
    }
  }
};

const checkTrustedAppsExistIfNeeded = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const currentState = store.getState();
  const currentEntriesExistState = entriesExistState(currentState);

  if (
    trustedAppsListPageActive(currentState) &&
    !isLoadingResourceState(currentEntriesExistState)
  ) {
    const currentListTotal = getListTotalItemsCount(currentState);
    const currentDoEntriesExist = entriesExist(currentState);

    if (
      !isLoadedResourceState(currentEntriesExistState) ||
      (currentListTotal === 0 && currentDoEntriesExist) ||
      (currentListTotal > 0 && !currentDoEntriesExist)
    ) {
      store.dispatch({
        type: 'trustedAppsExistStateChanged',
        payload: { type: 'LoadingResourceState', previousState: currentEntriesExistState },
      });

      let doTheyExist: boolean;
      try {
        const { total } = await trustedAppsService.getTrustedAppsList({
          page: 1,
          per_page: 1,
        });
        doTheyExist = total > 0;
      } catch (e) {
        // If a failure occurs, lets assume entries exits so that the UI is not blocked to the user
        doTheyExist = true;
      }

      store.dispatch({
        type: 'trustedAppsExistStateChanged',
        payload: { type: 'LoadedResourceState', data: doTheyExist },
      });
    }
  }
};

export const retrieveListOfPoliciesIfNeeded = async (
  { getState, dispatch }: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const currentState = getState();
  const currentPoliciesState = policiesState(currentState);
  const isLoading = isLoadingResourceState(currentPoliciesState);
  const isPageActive = trustedAppsListPageActive(currentState);
  const isCreateFlow = isCreationDialogLocation(currentState);
  const isUninitialized = isUninitialisedResourceState(currentPoliciesState);

  if (isPageActive && ((isCreateFlow && !isLoading) || isUninitialized)) {
    dispatch({
      type: 'trustedAppsPoliciesStateChanged',
      payload: {
        type: 'LoadingResourceState',
        previousState: currentPoliciesState,
      } as TrustedAppsListPageState['policies'],
    });

    try {
      const policyList = await trustedAppsService.getPolicyList({
        query: {
          page: 1,
          perPage: 1000,
        },
      });

      dispatch({
        type: 'trustedAppsPoliciesStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: policyList,
        },
      });
    } catch (error) {
      dispatch({
        type: 'trustedAppsPoliciesStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: error.body || error,
          lastLoadedState: getLastLoadedResourceState(policiesState(getState())),
        },
      });
    }
  }
};

const fetchEditTrustedAppIfNeeded = async (
  { getState, dispatch }: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const currentState = getState();
  const isPageActive = trustedAppsListPageActive(currentState);
  const isEditFlow = isEdit(currentState);
  const isAlreadyFetching = isFetchingEditTrustedAppItem(currentState);
  const editTrustedAppId = editItemId(currentState);

  if (isPageActive && isEditFlow && !isAlreadyFetching) {
    if (!editTrustedAppId) {
      const errorMessage = i18n.translate(
        'xpack.securitySolution.trustedapps.middleware.editIdMissing',
        {
          defaultMessage: 'No id provided',
        }
      );

      dispatch({
        type: 'trustedAppCreationEditItemStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: Object.assign(new Error(errorMessage), { statusCode: 404, error: errorMessage }),
        },
      });
      return;
    }

    let trustedAppForEdit = editingTrustedApp(currentState);

    // If Trusted App is already loaded, then do nothing
    if (trustedAppForEdit && trustedAppForEdit.id === editTrustedAppId) {
      return;
    }

    // See if we can get the Trusted App record from the current list of Trusted Apps being displayed
    trustedAppForEdit = getListItems(currentState).find((ta) => ta.id === editTrustedAppId);

    try {
      // Retrieve Trusted App record via API if it was not in the list data.
      // This would be the case when linking from another place or using an UUID for a Trusted App
      // that is not currently displayed on the list view.
      if (!trustedAppForEdit) {
        dispatch({
          type: 'trustedAppCreationEditItemStateChanged',
          payload: {
            type: 'LoadingResourceState',
          },
        });

        trustedAppForEdit = (await trustedAppsService.getTrustedApp({ id: editTrustedAppId })).data;
      }

      dispatch({
        type: 'trustedAppCreationEditItemStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: trustedAppForEdit,
        },
      });

      dispatch({
        type: 'trustedAppCreationDialogFormStateUpdated',
        payload: {
          entry: toUpdateTrustedApp(trustedAppForEdit),
          isValid: true,
        },
      });
    } catch (e) {
      dispatch({
        type: 'trustedAppCreationEditItemStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: e,
        },
      });
    }
  }
};

export const createTrustedAppsPageMiddleware = (
  trustedAppsService: TrustedAppsService
): ImmutableMiddleware<TrustedAppsListPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    // TODO: need to think if failed state is a good condition to consider need for refresh
    if (action.type === 'userChangedUrl' || action.type === 'trustedAppsListDataOutdated') {
      await refreshListIfNeeded(store, trustedAppsService);
      await checkTrustedAppsExistIfNeeded(store, trustedAppsService);
    }

    if (action.type === 'userChangedUrl') {
      updateCreationDialogIfNeeded(store);
      retrieveListOfPoliciesIfNeeded(store, trustedAppsService);
      fetchEditTrustedAppIfNeeded(store, trustedAppsService);
    }

    if (action.type === 'trustedAppCreationDialogConfirmed') {
      await submitCreationIfNeeded(store, trustedAppsService);
    }

    if (action.type === 'trustedAppDeletionDialogConfirmed') {
      await submitDeletionIfNeeded(store, trustedAppsService);
    }
  };
};

export const trustedAppsPageMiddlewareFactory: ImmutableMiddlewareFactory<
  TrustedAppsListPageState
> = (coreStart) => createTrustedAppsPageMiddleware(new TrustedAppsHttpService(coreStart.http));
