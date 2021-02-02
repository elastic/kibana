/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  needsRefreshOfListData,
  getCreationSubmissionResourceState,
  getCreationDialogFormEntry,
  isCreationDialogLocation,
  isCreationDialogFormValid,
  entriesExist,
  getListTotalItemsCount,
  trustedAppsListPageActive,
  entriesExistState,
} from './selectors';

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
      const response = await trustedAppsService.getTrustedAppsList({
        page: pageIndex + 1,
        per_page: pageSize,
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
  const submissionResourceState = getCreationSubmissionResourceState(store.getState());
  const isValid = isCreationDialogFormValid(store.getState());
  const entry = getCreationDialogFormEntry(store.getState());

  if (isStaleResourceState(submissionResourceState) && entry !== undefined && isValid) {
    store.dispatch(
      createTrustedAppCreationSubmissionResourceStateChanged({
        type: 'LoadingResourceState',
        previousState: submissionResourceState,
      })
    );

    try {
      store.dispatch(
        createTrustedAppCreationSubmissionResourceStateChanged({
          type: 'LoadedResourceState',
          // TODO: try to remove the cast
          data: (await trustedAppsService.createTrustedApp(entry as PostTrustedAppCreateRequest))
            .data,
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
    }

    if (action.type === 'trustedAppCreationDialogConfirmed') {
      await submitCreationIfNeeded(store, trustedAppsService);
    }

    if (action.type === 'trustedAppDeletionDialogConfirmed') {
      await submitDeletionIfNeeded(store, trustedAppsService);
    }
  };
};

export const trustedAppsPageMiddlewareFactory: ImmutableMiddlewareFactory<TrustedAppsListPageState> = (
  coreStart
) => createTrustedAppsPageMiddleware(new TrustedAppsHttpService(coreStart.http));
