/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory } from '../../types';
import { isOnHostPage, hasSelectedHost, uiQueryParams } from './selectors';
import { HostListState } from '../../types';
import { AppAction } from '../action';

export const hostMiddlewareFactory: MiddlewareFactory<HostListState> = coreStart => {
  return ({ getState, dispatch }) => next => async (action: AppAction) => {
    next(action);
    const state = getState();
    if (
      action.type === 'userChangedUrl' &&
      isOnHostPage(state) &&
      hasSelectedHost(state) !== true
    ) {
      const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(state);
      const response = await coreStart.http.post('/api/endpoint/metadata', {
        body: JSON.stringify({
          paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
        }),
      });
      response.request_page_index = Number(pageIndex);
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
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnHostDetails',
          payload: error,
        });
      }
    }
  };
};
