/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountContext } from 'kibana/public';
import { withPageNavigationStatus } from './common';
import { hrefIsForPath } from '../concerns/routing';
import { actions as endpointsListActions } from '../actions/endpoints_list';
import * as endpointsListSelectors from '../selectors/endpoints_list';

// TODO: type this properly
export async function endpointsListSaga(...args: any[]) {
  await Promise.all([resourceSaga(...args)]);
}

// TODO type actionsAndState, dispatch
async function resourceSaga(
  { actionsAndState, dispatch }: { actionsAndState: any; dispatch: any },
  context: AppMountContext
) {
  function isOnPage(href: any) {
    const isOnPageResponse: boolean = hrefIsForPath(
      href,
      `${context.core.http.basePath.get()}/app/endpoint/endpoints`
    );
    return isOnPageResponse;
  }

  for await (const {
    action,
    userIsOnPageAndLoggedIn,
    // href,
    state,
    shouldInitialize,
  } of withPageNavigationStatus({
    actionsAndState,
    isOnPage,
  })) {
    if (userIsOnPageAndLoggedIn) {
      if (
        shouldInitialize ||
        action.type === endpointsListActions.userPaginatedOrSortedEndpointListTable.type
      ) {
        try {
          const pageIndex = endpointsListSelectors.pageIndex(state);
          const pageSize = endpointsListSelectors.pageSize(state);
          const sortField = endpointsListSelectors.sortField(state);
          const sortDirection = endpointsListSelectors.sortDirection(state);

          const response = await context.core.http.get('/api/endpoint/endpoints', {
            query: {
              pageIndex,
              pageSize,
              sortField,
              sortDirection,
            },
          });
          dispatch(endpointsListActions.serverReturnedEndpointListData(response));
        } catch (error) {
          // TODO: dispatch an error action
          throw new Error(error);
        }
      }
    }
  }
}
