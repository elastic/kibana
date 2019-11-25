/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForPath } from '../concerns/routing';
import { actions as alertListActions } from '../actions/alert_list';
import * as alertListSelectors from '../selectors/alert_list';
import { SagaContext } from '../lib/saga';

export async function alertListSaga(sagaContext: SagaContext, context: AppMountContext) {
  await Promise.all([resourceSaga(sagaContext, context)]);
}

async function resourceSaga({ actionsAndState, dispatch }: SagaContext, context: AppMountContext) {
  function isOnPage(href: any) {
    return hrefIsForPath(href, `${context.core.http.basePath.get()}/app/endpoint/alerts`);
  }

  for await (const {
    action,
    userIsOnPageAndLoggedIn,
    state,
    shouldInitialize,
  } of withPageNavigationStatus({
    actionsAndState,
    isOnPage,
  })) {
    if (userIsOnPageAndLoggedIn) {
      if (
        shouldInitialize ||
        action.type === alertListActions.userPaginatedOrSortedTable.type ||
        action.type === alertListActions.serverReturnedArchiveItems.type
      ) {
        try {
          const pageIndex = alertListSelectors.pageIndex(state);
          const pageSize = alertListSelectors.pageSize(state);
          const sortField = alertListSelectors.sortField(state);
          const sortDirection = alertListSelectors.sortDirection(state);

          const response = await context.core.http.get('/alerts', {
            query: {
              pageIndex,
              pageSize,
              sortField,
              sortDirection,
            },
          });
          dispatch(alertListActions.serverReturnedData(response.elasticsearchResponse));
        } catch (error) {
          // TODO: dispatch an error action
          throw new Error(error);
        }
      } else if (action.type === alertListActions.userClickedArchiveItems.type) {
        try {
          const idsToArchive = action.payload[0] as string[];
          await context.core.http.post('/alerts/archive', {
            query: {
              alerts: idsToArchive.join(','), // TODO: seems strange that we can't use lists in query params
            },
          });
          dispatch(alertListActions.serverReturnedArchiveItems());
        } catch (error) {
          // TODO: dispatch an error action
          throw new Error(error);
        }
      }
    }
  }
}
