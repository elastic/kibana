/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpStart } from 'kibana/public';
import { matchPath } from 'react-router-dom';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { ImmutableMiddleware, ImmutableMiddlewareAPI } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../common/constants';
import {
  createFailedResourceState,
  createLoadedResourceState,
} from '../../../state/async_resource_builders';
import { getHostIsolationExceptionsList } from '../service';
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
      loadHostIsolationExceptionsList(store, coreStart.http);
    }
  };
};

async function loadHostIsolationExceptionsList(
  store: ImmutableMiddlewareAPI<HostIsolationExceptionsPageState, AppAction>,
  http: HttpStart
) {
  const { dispatch } = store;
  try {
    const entries = await getHostIsolationExceptionsList(http);

    // @TODO loading state

    dispatch({
      type: 'hostIsolationExceptionsPageDataChanged',
      payload: createLoadedResourceState(entries),
    });
  } catch (error) {
    dispatch({
      type: 'eventFiltersListPageDataExistsChanged',
      payload: createFailedResourceState<boolean>(error.body ?? error),
    });
  }
}

function isHostIsolationExceptionsPage(location: Immutable<AppLocation>) {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH,
      exact: true,
    }) !== null
  );
}
