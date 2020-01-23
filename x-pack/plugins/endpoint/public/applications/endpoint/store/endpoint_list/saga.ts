/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { SagaContext } from '../../lib';
import { EndpointListAction } from './action';

export const endpointListSaga = async (
  { actionsAndState, dispatch }: SagaContext<EndpointListAction>,
  coreStart: CoreStart
) => {
  const { post: httpPost } = coreStart.http;

  for await (const { action } of actionsAndState()) {
    if (action.type === 'userEnteredEndpointListPage') {
      const response = await httpPost('/api/endpoint/endpoints', {
        body: JSON.stringify({ paging_properties: [{ page_index: 1 }, { page_size: 2 }] }),
      });
      dispatch({
        type: 'serverReturnedEndpointList',
        payload: response,
      });
    }
  }
};
