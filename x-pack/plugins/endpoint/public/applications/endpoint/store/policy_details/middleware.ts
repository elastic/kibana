/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyDetailsState } from '../../types';
import { policyIdFromParams } from './selectors';
import { sendGetDatasource } from '../../services/ingest';
import { isOnPolicyPage } from '../../lib/is_on_page';

export const policyDetailsMiddlewareFactory: MiddlewareFactory<PolicyDetailsState> = coreStart => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => next => async action => {
    next(action);
    const state = getState();

    if (action.type === 'userChangedUrl' && isOnPolicyPage(state)) {
      const id = policyIdFromParams(state);

      const { item: policyItem } = await sendGetDatasource(http, id);

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
          policyConfig: {
            windows: {
              malware: {
                mode: 'detect',
              },
              eventing: {
                process: true,
                network: true,
              },
            },
            mac: {},
            linux: {},
          },
        },
      });
    }
  };
};
