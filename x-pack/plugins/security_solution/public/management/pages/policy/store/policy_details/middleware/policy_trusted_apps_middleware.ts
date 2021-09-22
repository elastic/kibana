/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MiddlewareRunner,
  MiddlewareRunnerContext,
  PolicyAssignedTrustedApps,
  PolicyDetailsStore,
} from '../../../types';
import { isOnPolicyTrustedAppsView } from '../selectors/policy_common_selectors';
import {
  doesPolicyTrustedAppsListNeedUpdate,
  getCurrentArtifactsLocation,
  getPolicyAssignedTrustedAppsState,
  isPolicyTrustedAppListLoading,
  policyIdFromParams,
} from '../selectors';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
  getLastLoadedResourceState,
} from '../../../../../state';
import { ServerApiError } from '../../../../../../common/types';
import { Immutable } from '../../../../../../../common/endpoint/types';

export const policyTrustedAppsMiddlewareRunner: MiddlewareRunner = async (
  context,
  store,
  action
) => {
  const state = store.getState();

  // If not on the Trusted Apps Policy view, then just return
  if (!isOnPolicyTrustedAppsView(state)) {
    return;
  }

  switch (action.type) {
    case 'userChangedUrl':
      fetchPolicyTrustedAppsIfNeeded(context, store);
      break;
  }
};

const fetchPolicyTrustedAppsIfNeeded = async (
  { trustedAppsService }: MiddlewareRunnerContext,
  { getState, dispatch }: PolicyDetailsStore
) => {
  const state = getState();

  if (isPolicyTrustedAppListLoading(state)) {
    return;
  }

  if (doesPolicyTrustedAppsListNeedUpdate(state)) {
    dispatch({
      type: 'assignedTrustedAppsListStateChanged',
      // @ts-ignore will be fixed when AsyncResourceState is refactored (#830)
      payload: createLoadingResourceState(getPolicyAssignedTrustedAppsState(state)),
    });

    try {
      const urlLocationData = getCurrentArtifactsLocation(state);
      const policyId = policyIdFromParams(state);
      const fetchResponse = await trustedAppsService.getTrustedAppsList({
        page: urlLocationData.page_index + 1,
        per_page: urlLocationData.page_size,
        kuery: `((exception-list-agnostic.attributes.tags:"policy:${policyId}") OR (exception-list-agnostic.attributes.tags:"policy:all"))${
          urlLocationData.filter ? ` AND (${urlLocationData.filter})` : ''
        }`,
      });

      dispatch({
        type: 'assignedTrustedAppsListStateChanged',
        payload: createLoadedResourceState<Immutable<PolicyAssignedTrustedApps>>({
          location: urlLocationData,
          artifacts: fetchResponse,
        }),
      });
    } catch (error) {
      dispatch({
        type: 'assignedTrustedAppsListStateChanged',
        payload: createFailedResourceState<Immutable<PolicyAssignedTrustedApps>>(
          error as ServerApiError,
          getLastLoadedResourceState<Immutable<PolicyAssignedTrustedApps>, ServerApiError>(
            getPolicyAssignedTrustedAppsState(getState())
          )
        ),
      });
    }
  }
};
