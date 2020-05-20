/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyDetailsState, UpdatePolicyResponse } from '../../types';
import {
  policyIdFromParams,
  isOnPolicyDetailsPage,
  policyDetails,
  policyDetailsForUpdate,
} from './selectors';
import {
  sendGetDatasource,
  sendGetFleetAgentStatusForConfig,
  sendPutDatasource,
} from '../policy_list/services/ingest';
import { NewPolicyData, PolicyData, Immutable } from '../../../../common/endpoint/types';
import { factory as policyConfigFactory } from '../../../../common/endpoint/models/policy_config';
import { ImmutableMiddlewareFactory } from '../../../common/store';

export const policyDetailsMiddlewareFactory: ImmutableMiddlewareFactory<Immutable<
  PolicyDetailsState
>> = coreStart => {
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
                value: policyConfigFactory(),
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
      const { id } = policyDetails(state) as PolicyData;
      const updatedPolicyItem = policyDetailsForUpdate(state) as NewPolicyData;

      let apiResponse: UpdatePolicyResponse;
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
