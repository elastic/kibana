/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import { MiddlewareFactory, PolicyListState } from '../../types';
import { isOnPolicyListPage } from './selectors';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const policyListMiddlewareFactory: MiddlewareFactory<PolicyListState> = coreStart => {
  return ({ getState, dispatch }) => next => async action => {
    next(action);

    if (action.type === 'userChangedUrl' && isOnPolicyListPage(getState())) {
      const { pageSize, pageIndex } = getPaginationFromUrlSearchParams(action.payload.search);

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

const getPaginationFromUrlSearchParams = (searchParams: string) => {
  const query = parse(searchParams);
  const pagination = {
    pageIndex: Number(query.page_index ?? 0),
    pageSize: Number(query.page_size ?? 10),
  };

  // If pageIndex is not a valid positive integer, set it to 0
  if (!Number.isFinite(pagination.pageIndex) || pagination.pageIndex < 0) {
    pagination.pageIndex = 0;
  }

  // if pageSize is not one of the expected page sizes, reset it to 10
  if (!PAGE_SIZES.includes(pagination.pageSize)) {
    pagination.pageSize = 10;
  }

  return pagination;
};
