/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointListState } from './types';
import { EndpointListAction } from './action';

const initialState = (): EndpointListState => {
  return {
    endpoints: [],
    request_page_size: 10,
    request_index: 0,
    total: 0,
  };
};

export const endpointListReducer = (state = initialState(), action: EndpointListAction) => {
  if (action.type === 'serverReturnedEndpointList') {
    return {
      ...state,
      ...action.payload,
    };
  }

  if (action.type === 'userExitedEndpointListPage') {
    return initialState();
  }

  return state;
};
