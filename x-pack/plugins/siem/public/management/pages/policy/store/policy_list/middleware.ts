/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetPolicyListResponse, PolicyListState } from '../../types';
import { sendGetEndpointSpecificDatasources } from './services/ingest';
import { isOnPolicyListPage, urlSearchParams } from './selectors';
import { ImmutableMiddlewareFactory } from '../../../../../common/store';
import { Immutable } from '../../../../../../common/endpoint/types';

export const policyListMiddlewareFactory: ImmutableMiddlewareFactory<Immutable<PolicyListState>> = (
  coreStart
) => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => (next) => async (action) => {
    next(action);

    const state = getState();
    if (action.type === 'userChangedUrl' && isOnPolicyListPage(state)) {
      const { page_index: pageIndex, page_size: pageSize } = urlSearchParams(state);
      let response: GetPolicyListResponse;

      try {
        response = await sendGetEndpointSpecificDatasources(http, {
          query: {
            perPage: pageSize,
            page: pageIndex + 1,
          },
        });
      } catch (err) {
        dispatch({
          type: 'serverFailedToReturnPolicyListData',
          payload: err.body ?? err,
        });
        return;
      }

      const { items: policyItems, total } = response;

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
