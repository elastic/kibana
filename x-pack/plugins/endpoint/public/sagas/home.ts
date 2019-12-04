/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForPath } from '../concerns/routing';
import { actions as homeActions } from '../actions/home';

// TODO: type this properly
export async function homeSaga(...args: any[]) {
  await Promise.all([resourceSaga(...args)]);
}

// TODO type actionsAndState, dispatch
async function resourceSaga(
  { actionsAndState, dispatch }: { actionsAndState: any; dispatch: any },
  context: AppMountContext
) {
  function isOnPage(href: any) {
    return hrefIsForPath(href, `${context.core.http.basePath.get()}/app/endpoint/`);
  }

  for await (const {
    action,
    userIsOnPageAndLoggedIn,
    href,
    state,
    shouldInitialize,
  } of withPageNavigationStatus({
    actionsAndState,
    isOnPage,
  })) {
    if (action.type === homeActions.userClickedBootstrap.type) {
      try {
        const data = await context.core.http.post('/endpoint/bootstrap', {});
        dispatch(homeActions.serverReturnedBootstrapData(data));
      } catch (error) {
        // TODO: dispatch an error action
        throw new Error(error);
      }
    }
  }
}
