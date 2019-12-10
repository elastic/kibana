/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForPath } from '../concerns/routing';
import { actions as homeActions } from '../actions/home';
import { SagaContext } from '../lib/saga';

let hasBootstrapped = false;

export async function homeSaga(sagaContext: SagaContext, context: AppMountContext) {
  await Promise.all([resourceSaga(sagaContext, context)]);
}

async function resourceSaga({ actionsAndState, dispatch }: SagaContext, context: AppMountContext) {
  function isOnPage(href: any) {
    return hrefIsForPath(href, `${context.core.http.basePath.get()}/app/endpoint/`);
  }

  for await (const { userIsOnPageAndLoggedIn, shouldInitialize } of withPageNavigationStatus({
    actionsAndState,
    isOnPage,
  })) {
    if (userIsOnPageAndLoggedIn && shouldInitialize && !hasBootstrapped) {
      try {
        const data = await context.core.http.post('/endpoint/bootstrap', {});
        hasBootstrapped = true;
        dispatch(homeActions.serverReturnedBootstrapData(data));
      } catch (error) {
        // TODO: dispatch an error action
        throw new Error(error);
      }
    }
  }
}
