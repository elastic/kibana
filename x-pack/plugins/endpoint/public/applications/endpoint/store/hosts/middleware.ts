/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImmutableMiddlewareFactory } from '../../types';
import { pageIndex, pageSize, isOnHostPage, hasSelectedHost, uiQueryParams } from './selectors';
import { HostListState } from '../../types';

export const hostMiddlewareFactory: ImmutableMiddlewareFactory<HostListState> = coreStart => {
  return ({ getState, dispatch }) => next => async action => {
    next(action);
    const state = getState();
    if (
      (action.type === 'userChangedUrl' &&
        isOnHostPage(state) &&
        hasSelectedHost(state) !== true) ||
      action.type === 'userPaginatedHostList'
    ) {
      const hostPageIndex = pageIndex(state);
      const hostPageSize = pageSize(state);
      const response = await coreStart.http.post('/api/endpoint/metadata', {
        body: JSON.stringify({
          paging_properties: [{ page_index: hostPageIndex }, { page_size: hostPageSize }],
        }),
      });
      response.request_page_index = hostPageIndex;
      dispatch({
        type: 'serverReturnedHostList',
        payload: response,
      });
    }
    if (action.type === 'userChangedUrl' && hasSelectedHost(state) !== false) {
      const { selected_host: selectedHost } = uiQueryParams(state);
      try {
        const response = await coreStart.http.get(`/api/endpoint/metadata/${selectedHost}`);
        dispatch({
          type: 'serverReturnedHostDetails',
          payload: response,
        });
        // FIXME: once we have the API implementation in place, we should call it parallel with the above api call and then dispatch this with the results of the second call
        dispatch({
          type: 'serverReturnedHostPolicyResponse',
          payload: {
            policy_response: {
              endpoint: {
                policy: {
                  status: 'success',
                },
              },
            },
          },
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnHostDetails',
          payload: error,
        });
      }
    }
  };
};
