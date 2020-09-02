/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { Immutable } from '../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import {
  AsyncDataBinding,
  StaleAsyncBinding,
  getLastPresentDataBinding,
} from '../state/async_data_binding';
import {
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state/trusted_apps_list_page_state';
import { TrustedAppsHttpService, TrustedAppsService } from '../service';
import { needsRefreshOfListData } from './selectors';
import { ListDataBindingChanged } from './action';

const createListDataBindingChangedAction = (
  newBinding: Immutable<AsyncDataBinding<TrustedAppsListData, ServerApiError>>
): Immutable<ListDataBindingChanged> => ({
  type: 'listDataBindingChanged',
  payload: { newBinding },
});

const refreshList = async (
  store: ImmutableMiddlewareAPI<TrustedAppsListPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const list = store.getState().listView;

  store.dispatch(
    createListDataBindingChangedAction({
      type: 'InProgressAsyncBinding',
      // need to think on how to avoid the casting
      previousBinding: list.currentListData as Immutable<
        StaleAsyncBinding<TrustedAppsListData, ServerApiError>
      >,
    })
  );

  try {
    const response = await trustedAppsService.getTrustedAppsList({
      page: list.currentPaginationInfo.index,
      per_page: list.currentPaginationInfo.size,
    });

    store.dispatch(
      createListDataBindingChangedAction({
        type: 'PresentAsyncBinding',
        data: {
          items: response.data,
          paginationInfo: list.currentPaginationInfo,
          totalItemsCount: response.total,
        },
      })
    );
  } catch (error) {
    store.dispatch(
      createListDataBindingChangedAction({
        type: 'FailedAsyncBinding',
        error,
        lastPresentBinding: getLastPresentDataBinding(list.currentListData),
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

    if (needsRefreshOfListData(store.getState())) {
      await refreshList(store, trustedAppsService);
    }
  };
};
