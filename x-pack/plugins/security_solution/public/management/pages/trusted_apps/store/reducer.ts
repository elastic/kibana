/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { parse } from 'querystring';
import { matchPath } from 'react-router-dom';
import { ImmutableReducer } from '../../../../common/store';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { MANAGEMENT_ROUTING_TRUSTED_APPS_PATH } from '../../../common/constants';
import { ListDataBindingChanged, TrustedAppsPageAction } from './action';
import { TrustedAppsListPageState } from '../state/trusted_apps_list_page_state';

type StateReducer = ImmutableReducer<TrustedAppsListPageState, TrustedAppsPageAction>;
type CaseReducer<T extends TrustedAppsPageAction> = (
  state: Immutable<TrustedAppsListPageState>,
  action: Immutable<T>
) => Immutable<TrustedAppsListPageState>;

const initialPageState: TrustedAppsListPageState = {
  listView: {
    currentListData: { type: 'UninitialisedAsyncBinding' },
    currentPaginationInfo: {
      index: 1,
      size: 10,
    },
  },
  active: false,
};

const isTrustedAppsPageLocation = (location: Immutable<AppLocation>) => {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
      exact: true,
    }) !== null
  );
};

const listDataBindingChanged: CaseReducer<ListDataBindingChanged> = (state, action) => {
  return {
    ...state,
    listView: {
      ...state.listView,
      currentListData: action.payload.newBinding,
    },
  };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isTrustedAppsPageLocation(action.payload)) {
    const query = parse(action.payload.search.slice(1));

    return {
      ...state,
      listView: {
        ...state.listView,
        currentPaginationInfo: {
          index: Number(query.page_index) || 1,
          size: Number(query.page_size) || 10,
        },
      },
      active: true,
    };
  } else {
    return {
      ...state,
      active: false,
    };
  }
};

const reducer: StateReducer = (state = initialPageState, action) => {
  switch (action.type) {
    case 'listDataBindingChanged':
      return listDataBindingChanged(state, action);

    case 'userChangedUrl':
      return userChangedUrl(state, action);
  }

  return state;
};

export { initialPageState as initialTrustedAppsPageState };
export { reducer as trustedAppsPageReducer };
