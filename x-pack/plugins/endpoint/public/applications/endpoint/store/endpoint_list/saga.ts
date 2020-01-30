/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { SagaContext } from '../../lib';
import { AppAction } from '../action';
import { endpointListPageIndex, endpointListPageSize } from './selectors';

export const endpointListSaga = async (
  { actionsAndState, dispatch }: SagaContext<AppAction>,
  coreStart: CoreStart
) => {
  const { post: httpPost } = coreStart.http;

  for await (const { action, state } of actionsAndState()) {
    if (
      (action.type === 'userNavigatedToPage' && action.payload === 'managementPage') ||
      action.type === 'userPaginatedEndpointListTable'
    ) {
      const pageIndex = endpointListPageIndex(state.endpointList);
      const pageSize = endpointListPageSize(state.endpointList);
      const response = await httpPost('/api/endpoint/endpoints', {
        body: JSON.stringify({
          paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
        }),
      });
      // temp: request_page_index to reflect user request page index, not es page index
      response.request_page_index = pageIndex;
      dispatch({
        type: 'serverReturnedEndpointList',
        payload: response,
      });
    }
  }
};
