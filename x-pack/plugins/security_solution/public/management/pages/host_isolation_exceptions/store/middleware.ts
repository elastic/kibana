/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpStart } from 'kibana/public';
import { matchPath } from 'react-router-dom';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { ImmutableMiddleware, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../common/constants';
import { HostIsolationExceptionsPageState } from '../types';

export function hostIsolationExceptionsMiddlewareFactory(coreStart: CoreStart) {
  return createHostIsolationExceptionsPageMiddleware(coreStart);
}

export const createHostIsolationExceptionsPageMiddleware = (
  coreStart: CoreStart
): ImmutableMiddleware<HostIsolationExceptionsPageState, AppAction> => {
  return (store) => (next) => async (action) => {
    next(action);

    if (action.type === 'userChangedUrl' && isHostIsolationExceptionsPage(action.payload)) {
      // todo LOAD the list
      console.log('welcome to the host list exception page');
      loadHostIsolationExceptionsList(coreStart.http);
    }
  };
};

function loadHostIsolationExceptionsList(http: HttpStart) {
  console.log('load that stuff', http);
}

function isHostIsolationExceptionsPage(location: Immutable<AppLocation>) {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
      exact: true,
    }) !== null
  );
}
