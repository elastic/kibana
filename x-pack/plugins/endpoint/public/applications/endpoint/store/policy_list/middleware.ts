/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyListState } from '../../types';
import { sendGetEndpoingDatasources } from '../../services/ingest';

export const policyListMiddlewareFactory: MiddlewareFactory<PolicyListState> = coreStart => {
  const http = coreStart.http;

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

      try {
        const { items: policyItems, total } = await sendGetEndpoingDatasources(http, {
          query: {
            perPage: pageSize,
            page: pageIndex + 1,
          },
        });

        dispatch({
          type: 'serverReturnedPolicyListData',
          payload: {
            policyItems,
            pageIndex,
            pageSize,
            total,
          },
        });
      } catch (err) {
        dispatch({
          type: 'serverFailedToReturnPolicyListData',
          payload: err.body ?? err,
        });
      }
    }
  };
};
