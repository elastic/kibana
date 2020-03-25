/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyDetailsState } from '../../types';
import { selectPolicyIdFromParams, isOnPolicyDetailsPage } from './selectors';
import {
  sendGetDatasource,
  sendGetFleetAgentStatusForConfig,
  sendPutDatasource,
  UpdateDatasourceResponse,
} from '../../services/ingest';

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

      // Agent summary is secondary data, so its ok for it to come after the details
      // page is populated with the main content
      // FIXME: need to only do this IF fleet is enabled
      if (policyItem.config_id) {
        const { results } = await sendGetFleetAgentStatusForConfig(http, policyItem.config_id);
        dispatch({
          type: 'serverReturnedPolicyDetailsAgentSummaryData',
          payload: {
            agentStatusSummary: results,
          },
        });
      }
    } else if (action.type === 'userClickedPolicyDetailsSaveButton') {
      const { policyId, policyData } = action.payload;

      let apiResponse: UpdateDatasourceResponse;

      try {
        apiResponse = await sendPutDatasource(http, policyId, {
          body: JSON.stringify({
            // "id": "8cbe3310-6aed-11ea-9523-4d4b019fef9b",
            name: 'endpoint-1',
            description: '',
            config_id: '53f9e1a0-6aed-11ea-9523-4d4b019fef9b',
            enabled: true,
            output_id: '',
            inputs: [
              {
                type: 'endpoint',
                enabled: true,
                config: {
                  policy: {
                    value: policyData,
                  },
                },
                streams: [],
              },
            ],
            namespace: 'default',
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.0.1',
            },
            // revision: 1,
          }),
        });
      } catch (error) {
        // FIXME: handle errors
      }
    }
  };
};
