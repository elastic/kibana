/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable, PostTrustedAppCreateRequest } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import {
  ImmutableMiddleware,
  ImmutableMiddlewareAPI,
  ImmutableMiddlewareFactory,
} from '../../../../common/store';

import { TrustedAppsHttpService, TrustedAppsService } from '../service';

import {
  AsyncResourceState,
  StaleResourceState,
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state';

import { TrustedAppsListResourceStateChanged } from './action';

import {
  getCurrentListResourceState,
  getLastLoadedListResourceState,
  getListCurrentPageIndex,
  getListCurrentPageSize,
  getTrustedAppCreateData,
  isCreatePending,
  needsRefreshOfListData,
} from './selectors';

const createTrustedAppsListResourceStateChangedAction = (
  newState: Immutable<AsyncResourceState<TrustedAppsListData>>
): Immutable<TrustedAppsListResourceStateChanged> => ({
  type: 'trustedAppsListResourceStateChanged',
  payload: { newState },
});

const refreshList = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  store.dispatch(
    createTrustedAppsListResourceStateChangedAction({
      type: 'LoadingResourceState',
      // need to think on how to avoid the casting
      previousState: getCurrentListResourceState(store.getState()) as Immutable<
        StaleResourceState<TrustedAppsListData>
      >,
    })
  );

  try {
    const pageIndex = getListCurrentPageIndex(store.getState());
    const pageSize = getListCurrentPageSize(store.getState());
    const response = await trustedAppsService.getTrustedAppsList({
      page: pageIndex + 1,
      per_page: pageSize,
    });

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction({
        type: 'LoadedResourceState',
        data: {
          items: response.data,
          totalItemsCount: response.total,
          paginationInfo: { index: pageIndex, size: pageSize },
        },
      })
    );
  } catch (error) {
    store.dispatch(
      createTrustedAppsListResourceStateChangedAction({
        type: 'FailedResourceState',
        error,
        lastLoadedState: getLastLoadedListResourceState(store.getState()),
      })
    );
  }
};

const createTrustedApp = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const { dispatch, getState } = store;

  if (isCreatePending(getState())) {
    try {
      const newTrustedApp = getTrustedAppCreateData(getState());
      const createdTrustedApp = (
        await trustedAppsService.createTrustedApp(newTrustedApp as PostTrustedAppCreateRequest)
      ).data;
      dispatch({
        type: 'serverReturnedCreateTrustedAppSuccess',
        payload: {
          type: 'success',
          data: createdTrustedApp,
        },
      });
      refreshList(store, trustedAppsService);
    } catch (error) {
      dispatch({
        type: 'serverReturnedCreateTrustedAppFailure',
        payload: {
          type: 'failure',
          data: error.body || error,
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
    if (action.type === 'userChangedUrl' && needsRefreshOfListData(store.getState())) {
      await refreshList(store, trustedAppsService);
    }

    if (action.type === 'userClickedSaveNewTrustedAppButton') {
      createTrustedApp(store, trustedAppsService);
    }
  };
};

export const trustedAppsPageMiddlewareFactory: ImmutableMiddlewareFactory<TrustedAppsListPageState> = (
  coreStart
) => createTrustedAppsPageMiddleware(new TrustedAppsHttpService(coreStart.http));
