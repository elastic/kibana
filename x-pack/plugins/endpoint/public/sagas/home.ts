/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForPath } from '../concerns/routing';
import { actions as homeActions } from '../actions/home';
import * as alertListSelectors from '../selectors/alert_list';

// TODO: type this properly
export async function alertListSaga(...args: any[]) {
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
    if (action.type === homeActions.userClickedArchiveItems.type) {
      try {
        const idsToArchive = action.payload[0];
        const data = await context.core.http.post('/alerts/archive', {
          query: {
            'index-pattern': 'blah', // TODO: seems strange that we can't use lists in query params
          },
        });
        dispatch(homeActions.serverReturnedData(data));
      } catch (error) {
        // TODO: dispatch an error action
        throw new Error(error);
      }
    }
  }
}
