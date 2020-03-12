/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyDetailsState } from '../../types';
import { selectPolicyIdFromParams } from './selectors';

export const policyDetailsMiddlewareFactory: MiddlewareFactory<PolicyDetailsState> = coreStart => {
  return ({ getState, dispatch }) => next => async action => {
    next(action);

    if (action.type === 'userNavigatedToPage' && action.payload === 'policyDetailsPage') {
      const state = getState();
      const id = selectPolicyIdFromParams(state);

      const { getFakeDatasourceDetailsApiResponse } = await import('../policy_list/fake_data');
      const policyItem = await getFakeDatasourceDetailsApiResponse(id);

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
        },
      });
    }
  };
};
