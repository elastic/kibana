/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyListState } from '../../types';

export const policyListMiddlewareFactory: MiddlewareFactory<PolicyListState> = coreStart => {
  const http = coreStart.http;
  const INGEST_API_ROOT = `/api/ingest_manager`;
  const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;

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

      const { items: policyItems, total, success } = await http.get(INGEST_API_DATASOURCES, {
        query: {
          kuery: 'datasources.package.name: endpoint',
          perPage: pageSize,
          page: pageIndex + 1,
        },
      });

      if (!success) {
        // FIXME: dispatch error
        return;
      }

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
