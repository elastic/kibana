/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { Immutable } from '../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { TrustedAppsItemsPage, TrustedAppsPageState } from '../state/trusted_apps_page_state';
import { TrustedAppsHttpService, TrustedAppsService } from '../service';
import { needsRefreshOfListData } from './selectors';
import { ListDataBindingChanged } from './action';
import {
  AsyncDataBinding,
  StaleAsyncBinding,
  getLastPresentDataBinding,
} from '../state/async_data_binding';

const createListDataBindingChangedAction = (
  newBinding: Immutable<AsyncDataBinding<TrustedAppsItemsPage, ServerApiError>>
): Immutable<ListDataBindingChanged> => ({
  type: 'listDataBindingChanged',
  payload: { newBinding },
});

const refreshList = async (
  store: ImmutableMiddlewareAPI<TrustedAppsPageState, AppAction>,
  trustedAppsService: TrustedAppsService
) => {
  const list = store.getState().list;

  store.dispatch(
    createListDataBindingChangedAction({
      type: 'InProgressAsyncBinding',
      // need to think on how to avoid the casting
      previousBinding: list.currentPage as Immutable<
        StaleAsyncBinding<TrustedAppsItemsPage, ServerApiError>
      >,
    })
  );

  try {
    const response = await trustedAppsService.getTrustedAppsList({
      page: list.currentPageInfo.index,
      per_page: list.currentPageInfo.size,
    });

    store.dispatch(
      createListDataBindingChangedAction({
        type: 'PresentAsyncBinding',
        data: {
          items: response.data,
          pageInfo: list.currentPageInfo,
          totalItemsCount: response.total,
        },
      })
    );
  } catch (error) {
    store.dispatch(
      createListDataBindingChangedAction({
        type: 'FailedAsyncBinding',
        error,
        lastPresentBinding: getLastPresentDataBinding(list.currentPage),
      })
    );
  }
};

export const trustedAppsPageMiddlewareFactory: ImmutableMiddlewareFactory<TrustedAppsPageState> = (
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
