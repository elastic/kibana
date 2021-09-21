/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, IHttpFetchError } from 'kibana/public';
import {
  DefaultPolicyNotificationMessage,
  DefaultPolicyRuleNotificationMessage,
} from '../../../../../../common/endpoint/models/policy_config';
import { PolicyDetailsState, UpdatePolicyResponse } from '../../types';
import {
  policyIdFromParams,
  isOnPolicyDetailsPage,
  policyDetails,
  policyDetailsForUpdate,
  needsToRefresh,
  isOnPolicyTrustedAppsPage,
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
} from './selectors';
import {
  sendGetPackagePolicy,
  sendGetFleetAgentStatusForPolicy,
  sendPutPackagePolicy,
} from '../services/ingest';
import {
  ImmutableArray,
  NewPolicyData,
  PolicyData,
  PostTrustedAppCreateRequest,
} from '../../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../../common/store';
import { getPolicyDataForUpdate } from '../../../../../../common/endpoint/service/policy/get_policy_data_for_update';
import { TrustedAppsHttpService, TrustedAppsService } from '../../../trusted_apps/service';
import {
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  createFailedResourceState,
} from '../../../../state';
import { parseQueryFilterToKQL } from '../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../trusted_apps/constants';
import { PolicyDetailsAction } from '.';

const searchTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService
) => {
  const state = store.getState();
  const location = getCurrentArtifactsLocation(state);
  const policyId = policyIdFromParams(state);

  store.dispatch({
    type: 'policyArtifactsAvailableListPageDataChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });

  try {
    const kuery = [
      `(not exception-list-agnostic.attributes.tags:"policy:${policyId}") AND (not exception-list-agnostic.attributes.tags:"policy:all")`,
    ];

    const filterKuery = parseQueryFilterToKQL(location.filter, SEARCHABLE_FIELDS) || undefined;
    if (filterKuery) kuery.push(filterKuery);

    const trustedApps = await trustedAppsService.getTrustedAppsList({
      page: 1,
      per_page: 100,
      kuery: kuery.join(' AND '),
    });

    store.dispatch({
      type: 'policyArtifactsAvailableListPageDataChanged',
      payload: createLoadedResourceState({
        items: trustedApps.data,
        pageIndex: 1,
        pageSize: 100,
        totalItemsCount: trustedApps.total,
        timestamp: Date.now(),
        filter: location.filter,
        excludedPolicies: '',
        includedPolicies: policyId,
      }),
    });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsAvailableListPageDataChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

const updateTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService,
  trustedAppsIds: ImmutableArray<string>
) => {
  const state = store.getState();
  const policyId = policyIdFromParams(state);
  const availavleArtifacts = getAvailableArtifactsList(state);

  if (!availavleArtifacts || !availavleArtifacts.items.length) {
    return;
  }

  store.dispatch({
    type: 'policyArtifactsUpdateTrustedAppsChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });

  try {
    const updatedTrustedApps = [];

    for (const entry of availavleArtifacts.items) {
      if (trustedAppsIds.includes(entry.id)) {
        const policies = entry.effectScope.type === 'policy' ? entry.effectScope.policies : [];
        const trustedApp = await trustedAppsService.updateTrustedApp({ id: entry.id }, {
          effectScope: { type: 'policy', policies: [...policies, policyId] },
          name: entry.name,
          entries: entry.entries,
          os: entry.os,
          description: entry.description,
          version: entry.version,
        } as PostTrustedAppCreateRequest);
        updatedTrustedApps.push(trustedApp);
      }
    }
    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      payload: createLoadedResourceState(updatedTrustedApps),
    });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

const savePolicy = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  http: HttpSetup
) => {
  const state = store.getState();
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
    store.dispatch({
      type: 'serverReturnedPolicyDetailsUpdateFailure',
      payload: {
        success: false,
        error: error.body || error,
      },
    });
    return;
  }

  store.dispatch({
    type: 'serverReturnedUpdatedPolicyDetailsData',
    payload: {
      policyItem: apiResponse.item,
      updateStatus: {
        success: true,
      },
    },
  });
};

export const policyDetailsMiddlewareFactory: ImmutableMiddlewareFactory<PolicyDetailsState> = (
  coreStart
) => {
  const http = coreStart.http;
  const trustedAppsService = new TrustedAppsHttpService(http);
  return (store) => (next) => async (action) => {
    next(action);
    const state = store.getState();
    if (action.type === 'userChangedUrl' && needsToRefresh(state) && isOnPolicyDetailsPage(state)) {
      const id = policyIdFromParams(state);
      let policyItem: PolicyData;

      try {
        policyItem = (await sendGetPackagePolicy(http, id)).item;
        // sets default user notification message if policy config message is empty
        if (policyItem.inputs[0].config.policy.value.windows.popup.malware.message === '') {
          policyItem.inputs[0].config.policy.value.windows.popup.malware.message = DefaultPolicyNotificationMessage;
          policyItem.inputs[0].config.policy.value.mac.popup.malware.message = DefaultPolicyNotificationMessage;
          policyItem.inputs[0].config.policy.value.linux.popup.malware.message = DefaultPolicyNotificationMessage;
        }
        if (policyItem.inputs[0].config.policy.value.windows.popup.ransomware.message === '') {
          policyItem.inputs[0].config.policy.value.windows.popup.ransomware.message = DefaultPolicyNotificationMessage;
        }
        if (
          policyItem.inputs[0].config.policy.value.windows.popup.memory_protection.message === ''
        ) {
          policyItem.inputs[0].config.policy.value.windows.popup.memory_protection.message = DefaultPolicyRuleNotificationMessage;
        }
        if (
          policyItem.inputs[0].config.policy.value.windows.popup.behavior_protection.message === ''
        ) {
          policyItem.inputs[0].config.policy.value.windows.popup.behavior_protection.message = DefaultPolicyRuleNotificationMessage;
        }
        if (policyItem.inputs[0].config.policy.value.mac.popup.behavior_protection.message === '') {
          policyItem.inputs[0].config.policy.value.mac.popup.behavior_protection.message = DefaultPolicyRuleNotificationMessage;
        }
        if (
          policyItem.inputs[0].config.policy.value.linux.popup.behavior_protection.message === ''
        ) {
          policyItem.inputs[0].config.policy.value.linux.popup.behavior_protection.message = DefaultPolicyRuleNotificationMessage;
        }
      } catch (error) {
        store.dispatch({
          type: 'serverFailedToReturnPolicyDetailsData',
          payload: error.body || error,
        });
        return;
      }

      store.dispatch({
        type: 'serverReturnedPolicyDetailsData',
        payload: {
          policyItem,
        },
      });

      // Agent summary is secondary data, so its ok for it to come after the details
      // page is populated with the main content
      if (policyItem.policy_id) {
        const { results } = await sendGetFleetAgentStatusForPolicy(http, policyItem.policy_id);
        store.dispatch({
          type: 'serverReturnedPolicyDetailsAgentSummaryData',
          payload: {
            agentStatusSummary: results,
          },
        });
      }
    }
    if (
      action.type === 'userChangedUrl' &&
      isOnPolicyTrustedAppsPage(state) &&
      getCurrentArtifactsLocation(state).show === 'list'
    ) {
      await searchTrustedApps(store, trustedAppsService);
    }
    if (
      action.type === 'policyArtifactsUpdateTrustedApps' &&
      isOnPolicyTrustedAppsPage(state) &&
      getCurrentArtifactsLocation(state).show === 'list'
    ) {
      await updateTrustedApps(store, trustedAppsService, action.payload.trustedAppIds);
    }
    if (action.type === 'userClickedPolicyDetailsSaveButton') {
      await savePolicy(store, http);
    }
  };
};
