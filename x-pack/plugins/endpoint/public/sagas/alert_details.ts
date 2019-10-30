/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForAlertDetail, alertIdFromHref } from '../concerns/alerts/routing';
import { actions as alertDetailsActions } from '../actions/alert_details';

// TODO: type this properly
export async function alertDetailsSaga(...args: any[]) {
  await Promise.all([resourceSaga(...args)]);
}

// TODO type actionsAndState, dispatch
async function resourceSaga(
  { actionsAndState, dispatch }: { actionsAndState: any; dispatch: any },
  context: AppMountContext
) {
  for await (const {
    action,
    userIsOnPageAndLoggedIn,
    href,
    state,
    shouldInitialize,
  } of withPageNavigationStatus({
    actionsAndState,
    isOnPage: hrefIsForAlertDetail,
  })) {
    if (userIsOnPageAndLoggedIn) {
      if (shouldInitialize) {
        try {
          const response = await context.core.http.get('/alerts/' + alertIdFromHref(href), {});
          dispatch(
            alertDetailsActions.serverReturnedAlertDetailsData(
              response.elasticsearchResponse.hits.hits[0]
            )
          );
        } catch (error) {
          // TODO: dispatch an error action
          throw new Error(error);
        }
      }
    }
  }
}
