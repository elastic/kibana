/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyListState } from '../../types';

export const policyListMiddlewareFactory: MiddlewareFactory<PolicyListState> = coreStart => {
  return ({ getState, dispatch }) => next => async action => {
    next(action);

    if (
      (action.type === 'userNavigatedToPage' && action.payload === 'policyListPage') ||
      action.type === 'userPaginatedPolicyListTable'
    ) {
      const state = getState();
      let pageSize: number;
      let pageIndex: number;

      if (action.type === 'userPaginatedPolicyListTable') {
        pageSize = action.payload.pageSize;
        pageIndex = action.payload.pageIndex;
      } else {
        pageSize = state.pageSize;
        pageIndex = state.pageIndex;
      }

      // Need load data from API and remove fake data below
      // Refactor tracked via: https://github.com/elastic/endpoint-app-team/issues/150
      const { getFakeDatasourceApiResponse } = await import('./fake_data');
      const { items: policyItems, total } = await getFakeDatasourceApiResponse(pageIndex, pageSize);

      dispatch({
        type: 'serverReturnedPolicyListData',
        payload: {
          policyItems,
          pageIndex,
          pageSize,
          total,
        },
      });
    }
  };
};
