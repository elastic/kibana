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
import { TrustedAppsPageState } from '../state/trusted_apps_page_state';

type StateReducer = ImmutableReducer<TrustedAppsPageState, TrustedAppsPageAction>;
type CaseReducer<T extends TrustedAppsPageAction> = (
  state: Immutable<TrustedAppsPageState>,
  action: Immutable<T>
) => Immutable<TrustedAppsPageState>;

const initialPageState: TrustedAppsPageState = {
  list: {
    currentPage: { type: 'UninitialisedAsyncBinding' },
    currentPageInfo: {
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
    list: {
      ...state.list,
      currentPage: action.payload.newBinding,
    },
  };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isTrustedAppsPageLocation(action.payload)) {
    const query = parse(action.payload.search.slice(1));

    return {
      ...state,
      list: {
        ...state.list,
        currentPageInfo: {
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
