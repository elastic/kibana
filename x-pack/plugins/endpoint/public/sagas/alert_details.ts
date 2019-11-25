/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForAlertDetail, alertIdFromHref } from '../concerns/alerts/routing';
import { actions as alertDetailsActions } from '../actions/alert_details';
import { SagaContext } from '../lib/saga';

// TODO: type this properly
export async function alertDetailsSaga(
  sagaContext: SagaContext,
  context: AppMountContext,
  history: History
) {
  await Promise.all([resourceSaga(sagaContext, context, history)]);
}

async function resourceSaga(
  { actionsAndState, dispatch }: SagaContext,
  context: AppMountContext,
  history: History
) {
  for await (const {
    action,
    userIsOnPageAndLoggedIn,
    href,
    shouldInitialize,
    hrefChanged,
  } of withPageNavigationStatus({
    actionsAndState,
    isOnPage: hrefIsForAlertDetail,
  })) {
    if (userIsOnPageAndLoggedIn) {
      if (shouldInitialize || hrefChanged) {
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
      } else if (action.type === alertDetailsActions.userClosedAlertDetailsFlyout.type) {
        history.push('/alerts');
      }
    }
  }
}
