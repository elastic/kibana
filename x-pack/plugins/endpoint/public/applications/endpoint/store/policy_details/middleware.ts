/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MiddlewareFactory, PolicyData, PolicyDetailsState } from '../../types';
import { policyIdFromParams, isOnPolicyDetailsPage, policyDetails } from './selectors';
import {
  sendGetDatasource,
  sendGetFleetAgentStatusForConfig,
  sendPutDatasource,
  UpdateDatasourceResponse,
} from '../../services/ingest';
import { generatePolicy } from '../../models/policy';

export const policyDetailsMiddlewareFactory: MiddlewareFactory<PolicyDetailsState> = coreStart => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => next => async action => {
    next(action);
    const state = getState();

    if (action.type === 'userChangedUrl' && isOnPolicyDetailsPage(state)) {
      const id = policyIdFromParams(state);
      let policyItem: PolicyData;

      try {
        policyItem = (await sendGetDatasource(http, id)).item;
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnPolicyDetailsData',
          payload: error.body || error,
        });
        return;
      }

      // FIXME: remove this code once the Default Policy is available in the endpoint package - see: https://github.com/elastic/endpoint-app-team/issues/295
      // Until we get the Default configuration into the Endpoint package so that the datasource has
      // the expected data structure, we will add it here manually.
      if (!policyItem.inputs.length) {
        policyItem.inputs = [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: generatePolicy(),
              },
            },
          },
        ];
      }

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
        },
      });

      // Agent summary is secondary data, so its ok for it to come after the details
      // page is populated with the main content
      // FIXME: need to only do this IF fleet is enabled - see: https://github.com/elastic/endpoint-app-team/issues/296
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
      const { id, revision, ...updatedPolicyItem } = policyDetails(state) as PolicyData;

      let apiResponse: UpdateDatasourceResponse;
      try {
        apiResponse = await sendPutDatasource(http, id, updatedPolicyItem);
      } catch (error) {
        dispatch({
          type: 'serverReturnedPolicyDetailsUpdateFailure',
          payload: {
            success: false,
            error: error.body || error,
          },
        });
        return;
      }

      dispatch({
        type: 'serverReturnedUpdatedPolicyDetailsData',
        payload: {
          policyItem: apiResponse.item,
          updateStatus: {
            success: true,
          },
        },
      });
    }
  };
};
