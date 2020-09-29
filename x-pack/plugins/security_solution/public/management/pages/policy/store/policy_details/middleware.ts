/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IHttpFetchError } from 'kibana/public';
import { PolicyDetailsState, UpdatePolicyResponse } from '../../types';
import {
  policyIdFromParams,
  isOnPolicyDetailsPage,
  policyDetails,
  policyDetailsForUpdate,
  getPolicyDataForUpdate,
} from './selectors';
import {
  sendGetPackagePolicy,
  sendGetFleetAgentStatusForPolicy,
  sendPutPackagePolicy,
} from '../policy_list/services/ingest';
import { NewPolicyData, PolicyData } from '../../../../../../common/endpoint/types';
import { ImmutableMiddlewareFactory } from '../../../../../common/store';

export const policyDetailsMiddlewareFactory: ImmutableMiddlewareFactory<PolicyDetailsState> = (
  coreStart
) => {
  const http = coreStart.http;

  return ({ getState, dispatch }) => (next) => async (action) => {
    next(action);
    const state = getState();

    if (action.type === 'userChangedUrl' && isOnPolicyDetailsPage(state)) {
      const id = policyIdFromParams(state);
      let policyItem: PolicyData;

      try {
        policyItem = (await sendGetPackagePolicy(http, id)).item;
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnPolicyDetailsData',
          payload: error.body || error,
        });
        return;
      }

      dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
        },
      });

      // Agent summary is secondary data, so its ok for it to come after the details
      // page is populated with the main content
      if (policyItem.policy_id) {
        const { results } = await sendGetFleetAgentStatusForPolicy(http, policyItem.policy_id);
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
        apiResponse = await sendPutPackagePolicy(http, id, updatedPolicyItem).catch(
          (error: IHttpFetchError) => {
            if (!error.response || error.response.status !== 409) {
              return Promise.reject(error);
            }
            // Handle 409 error (version conflict) here, by using the latest document
            // for the package policy and adding the updated policy to it, ensuring that
            // any recent updates to `manifest_artifacts` are retained.
            return sendGetPackagePolicy(http, id).then((packagePolicy) => {
              const latestUpdatedPolicyItem = packagePolicy.item;
              latestUpdatedPolicyItem.inputs[0].config.policy =
                updatedPolicyItem.inputs[0].config.policy;

              return sendPutPackagePolicy(
                http,
                id,
                getPolicyDataForUpdate(latestUpdatedPolicyItem) as NewPolicyData
              );
            });
          }
        );
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
