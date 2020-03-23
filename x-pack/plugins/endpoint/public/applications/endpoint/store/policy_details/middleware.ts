/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyDetailsState } from '../../types';
import { selectPolicyIdFromParams, isOnPolicyDetailsPage } from './selectors';
import { sendGetDatasource } from '../../services/ingest';

export const policyDetailsMiddlewareFactory: MiddlewareFactory<PolicyDetailsState> = coreStart => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => next => async action => {
    next(action);
    const state = getState();

    if (action.type === 'userChangedUrl' && isOnPolicyDetailsPage(state)) {
      const id = selectPolicyIdFromParams(state);

      const { item: policyItem } = await sendGetDatasource(http, id);

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
        },
      });
    }
  };
};
