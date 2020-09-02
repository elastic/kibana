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
import {
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../common/constants';
import { TrustedAppsListDataBindingChanged, TrustedAppsPageAction } from './action';
import { TrustedAppsListPageState } from '../state/trusted_apps_list_page_state';

type StateReducer = ImmutableReducer<TrustedAppsListPageState, TrustedAppsPageAction>;
type CaseReducer<T extends TrustedAppsPageAction> = (
  state: Immutable<TrustedAppsListPageState>,
  action: Immutable<T>
) => Immutable<TrustedAppsListPageState>;

const isTrustedAppsPageLocation = (location: Immutable<AppLocation>) => {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
      exact: true,
    }) !== null
  );
};

const trustedAppsListDataBindingChanged: CaseReducer<TrustedAppsListDataBindingChanged> = (
  state,
  action
) => {
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
          index: Number(query.page_index) || MANAGEMENT_DEFAULT_PAGE,
          size: Number(query.page_size) || MANAGEMENT_DEFAULT_PAGE_SIZE,
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

export const initialTrustedAppsPageState: TrustedAppsListPageState = {
  listView: {
    currentListData: { type: 'UninitialisedAsyncBinding' },
    currentPaginationInfo: {
      index: MANAGEMENT_DEFAULT_PAGE,
      size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    },
  },
  active: false,
};

export const trustedAppsPageReducer: StateReducer = (
  state = initialTrustedAppsPageState,
  action
) => {
  switch (action.type) {
    case 'trustedAppsListDataBindingChanged':
      return trustedAppsListDataBindingChanged(state, action);

    case 'userChangedUrl':
      return userChangedUrl(state, action);
  }

  return state;
};
