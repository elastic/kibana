/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import {
  AsyncResourceState,
  StaleResourceState,
  getLastLoadedResourceState,
} from '../state/async_resource_state';
import {
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state/trusted_apps_list_page_state';
import { TrustedAppsHttpService, TrustedAppsService } from '../service';
import { needsRefreshOfListData } from './selectors';
import { TrustedAppsListResourceStateChanged } from './action';

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
  const list = store.getState().listView;

  store.dispatch(
    createTrustedAppsListResourceStateChangedAction({
      type: 'LoadingResourceState',
      // need to think on how to avoid the casting
      previousState: list.currentListData as Immutable<StaleResourceState<TrustedAppsListData>>,
    })
  );

  try {
    const response = await trustedAppsService.getTrustedAppsList({
      page: list.currentPaginationInfo.index + 1,
      per_page: list.currentPaginationInfo.size,
    });

    store.dispatch(
      createTrustedAppsListResourceStateChangedAction({
        type: 'LoadedResourceState',
        data: {
          items: response.data,
          paginationInfo: list.currentPaginationInfo,
          totalItemsCount: response.total,
        },
      })
    );
  } catch (error) {
    store.dispatch(
      createTrustedAppsListResourceStateChangedAction({
        type: 'FailedResourceState',
        error,
        lastLoadedState: getLastLoadedResourceState(list.currentListData),
      })
    );
  }
};

export const trustedAppsPageMiddlewareFactory: ImmutableMiddlewareFactory<TrustedAppsListPageState> = (
  coreStart
) => {
  const trustedAppsService: TrustedAppsService = new TrustedAppsHttpService(coreStart.http);

  return (store) => (next) => async (action) => {
    next(action);

    // TODO: need to think if failed state is a good condition to consider need for refresh
    if (action.type === 'userChangedUrl' && needsRefreshOfListData(store.getState())) {
      await refreshList(store, trustedAppsService);
    }
  };
};
