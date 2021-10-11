/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { parse } from 'querystring';
import { matchPath } from 'react-router-dom';
import { ImmutableReducer } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { extractHostIsolationExceptionsPageLocation } from '../../../common/routing';
import { HostIsolationExceptionsPageState } from '../types';
import { initialHostIsolationExceptionsPageState } from './builders';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../common/constants';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { createUninitialisedResourceState } from '../../../state';

type StateReducer = ImmutableReducer<HostIsolationExceptionsPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<HostIsolationExceptionsPageState>,
  action: Immutable<T>
) => Immutable<HostIsolationExceptionsPageState>;

const isHostIsolationExceptionsPageLocation = (location: Immutable<AppLocation>) => {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
      exact: true,
    }) !== null
  );
};

export const hostIsolationExceptionsPageReducer: StateReducer = (
  state = initialHostIsolationExceptionsPageState(),
  action
) => {
  switch (action.type) {
    case 'hostIsolationExceptionsPageDataChanged': {
      return {
        ...state,
        entries: action.payload,
      };
    }
    case 'userChangedUrl':
      return userChangedUrl(state, action);
    case 'hostIsolationExceptionsMarkToDelete': {
      return {
        ...state,
        deletion: {
          item: action.payload,
          status: createUninitialisedResourceState(),
        },
      };
    }
    case 'hostIsolationExceptionsDeleteStatusChanged':
      return {
        ...state,
        deletion: {
          ...state.deletion,
          status: action.payload,
        },
      };
  }
  return state;
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isHostIsolationExceptionsPageLocation(action.payload)) {
    const location = extractHostIsolationExceptionsPageLocation(
      parse(action.payload.search.slice(1))
    );
    return {
      ...state,
      location,
    };
  }
  return state;
};
