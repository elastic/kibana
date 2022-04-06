/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from 'kibana/public';
import {
  DefaultPolicyNotificationMessage,
  DefaultPolicyRuleNotificationMessage,
} from '../../../../../../../common/endpoint/models/policy_config';
import { MiddlewareRunner, UpdatePolicyResponse } from '../../../types';
import {
  policyIdFromParams,
  isOnPolicyDetailsPage,
  policyDetails,
  policyDetailsForUpdate,
  needsToRefresh,
} from '../selectors/policy_settings_selectors';
import {
  sendGetPackagePolicy,
  sendGetFleetAgentStatusForPolicy,
  sendPutPackagePolicy,
} from '../../../../../services/policies/ingest';
import { NewPolicyData, PolicyData } from '../../../../../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../../../../../common/endpoint/service/policy';

export const policySettingsMiddlewareRunner: MiddlewareRunner = async (
  { coreStart },
  { dispatch, getState },
  action
) => {
  const http = coreStart.http;
  const state = getState();

  if (action.type === 'userChangedUrl' && needsToRefresh(state) && isOnPolicyDetailsPage(state)) {
    const id = policyIdFromParams(state);
    let policyItem: PolicyData;

    try {
      policyItem = (await sendGetPackagePolicy(http, id)).item;
      // sets default user notification message if policy config message is empty
      if (policyItem.inputs[0].config.policy.value.windows.popup.malware.message === '') {
        policyItem.inputs[0].config.policy.value.windows.popup.malware.message =
          DefaultPolicyNotificationMessage;
        policyItem.inputs[0].config.policy.value.mac.popup.malware.message =
          DefaultPolicyNotificationMessage;
        policyItem.inputs[0].config.policy.value.linux.popup.malware.message =
          DefaultPolicyNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.windows.popup.ransomware.message === '') {
        policyItem.inputs[0].config.policy.value.windows.popup.ransomware.message =
          DefaultPolicyNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.windows.popup.memory_protection.message === '') {
        policyItem.inputs[0].config.policy.value.windows.popup.memory_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.mac.popup.memory_protection.message === '') {
        policyItem.inputs[0].config.policy.value.mac.popup.memory_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.linux.popup.memory_protection.message === '') {
        policyItem.inputs[0].config.policy.value.linux.popup.memory_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
      if (
        policyItem.inputs[0].config.policy.value.windows.popup.behavior_protection.message === ''
      ) {
        policyItem.inputs[0].config.policy.value.windows.popup.behavior_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.mac.popup.behavior_protection.message === '') {
        policyItem.inputs[0].config.policy.value.mac.popup.behavior_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
      if (policyItem.inputs[0].config.policy.value.linux.popup.behavior_protection.message === '') {
        policyItem.inputs[0].config.policy.value.linux.popup.behavior_protection.message =
          DefaultPolicyRuleNotificationMessage;
      }
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

            return sendPutPackagePolicy(http, id, getPolicyDataForUpdate(latestUpdatedPolicyItem));
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
