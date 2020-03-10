/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory } from '../../types';
import {
  pageIndex,
  pageSize,
  isOnManagementPage,
  hasSelectedHost,
  uiQueryParams,
} from './selectors';
import { ManagementListState } from '../../types';
import { AppAction } from '../action';
import { MetadataIndexGetBodyInput } from '../../../../../common/types';

export const managementMiddlewareFactory: MiddlewareFactory<ManagementListState> = coreStart => {
  return ({ getState, dispatch }) => next => async (action: AppAction) => {
    next(action);
    const state = getState();
    if (
      (action.type === 'userChangedUrl' &&
        isOnManagementPage(state) &&
        hasSelectedHost(state) !== true) ||
      action.type === 'userPaginatedManagementList'
    ) {
      const managementPageIndex = pageIndex(state);
      const managementPageSize = pageSize(state);
      const body: MetadataIndexGetBodyInput = {
        paging_properties: [{ page_index: managementPageIndex }, { page_size: managementPageSize }],
      };
      const response = await coreStart.http.post('/api/endpoint/metadata', {
        body: JSON.stringify(body),
      });
      response.request_page_index = managementPageIndex;
      dispatch({
        type: 'serverReturnedManagementList',
        payload: response,
      });
    }
    if (action.type === 'userChangedUrl' && hasSelectedHost(state) !== false) {
      const { selected_host: selectedHost } = uiQueryParams(state);
      try {
        const response = await coreStart.http.get(`/api/endpoint/metadata/${selectedHost}`);
        dispatch({
          type: 'serverReturnedManagementDetails',
          payload: response,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnManagementDetails',
          payload: error,
        });
      }
    }
  };
};
