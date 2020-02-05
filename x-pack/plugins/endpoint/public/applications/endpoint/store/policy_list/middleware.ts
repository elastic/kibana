/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory } from '../../types';

export const policyListMiddlewareFactory: MiddlewareFactory = coreStart => {
  return ({ getState, dispatch }) => next => async action => {
    next(action);

    if (
      (action.type === 'userNavigatedToPage' && action.payload === 'policyListPage') ||
      action.type === 'userPaginatedPolicyListTable'
    ) {
      // load data from API
      // Refactor tracked via: https://github.com/elastic/endpoint-app-team/issues/150
    }
  };
};
