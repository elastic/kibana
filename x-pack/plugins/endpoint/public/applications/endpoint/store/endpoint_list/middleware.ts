/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory } from '../../types';
import { pageIndex, pageSize } from './selectors';
import { ManagementState } from '../../types';
import { AppAction } from '../action';

export const managementMiddlewareFactory: MiddlewareFactory<ManagementState> = coreStart => {
  return ({ getState, dispatch }) => next => async (action: AppAction) => {
    next(action);
    if (
      (action.type === 'userNavigatedToPage' && action.payload === 'managementPage') ||
      action.type === 'userPaginatedEndpointListTable'
    ) {
      const managementPageIndex = pageIndex(getState());
      const managementPageSize = pageSize(getState());
      const response = await coreStart.http.post('/api/endpoint/endpoints', {
        body: JSON.stringify({
          paging_properties: [
            { page_index: managementPageIndex },
            { page_size: managementPageSize },
          ],
        }),
      });
      response.request_page_index = managementPageIndex;
      dispatch({
        type: 'serverReturnedEndpointList',
        payload: response,
      });
      dispatch({ type: 'serverReturnedAlertsData', payload: response });
    }
  };
};
