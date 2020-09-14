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
import { AppAction } from '../../../../common/store/actions';
import { extractListPaginationParams } from '../../../common/routing';
import {
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../common/constants';

import { TrustedAppsListResourceStateChanged } from './action';
import { TrustedAppsListPageState } from '../state';

type StateReducer = ImmutableReducer<TrustedAppsListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
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

const trustedAppsListResourceStateChanged: CaseReducer<TrustedAppsListResourceStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    listView: {
      ...state.listView,
      currentListResourceState: action.payload.newState,
    },
  };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isTrustedAppsPageLocation(action.payload)) {
    const paginationParams = extractListPaginationParams(parse(action.payload.search.slice(1)));

    return {
      ...state,
      listView: {
        ...state.listView,
        currentPaginationInfo: {
          index: paginationParams.page_index,
          size: paginationParams.page_size,
        },
      },
      active: true,
    };
  } else {
    return initialTrustedAppsPageState;
  }
};

export const initialTrustedAppsPageState: TrustedAppsListPageState = {
  listView: {
    currentListResourceState: { type: 'UninitialisedResourceState' },
    currentPaginationInfo: {
      index: MANAGEMENT_DEFAULT_PAGE,
      size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    },
    freshDataTimestamp: new Date().getTime(),
  },
  active: false,
};

export const trustedAppsPageReducer: StateReducer = (
  state = initialTrustedAppsPageState,
  action
) => {
  switch (action.type) {
    case 'trustedAppsListResourceStateChanged':
      return trustedAppsListResourceStateChanged(state, action);

    case 'userChangedUrl':
      return userChangedUrl(state, action);
  }

  return state;
};
