/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { HostInfo, HostResultList } from '../../../../../common/endpoint/types';
import { GetPolicyListResponse } from '../../policy/types';
import { ImmutableMiddlewareFactory } from '../../../../common/store';
import {
  isOnEndpointPage,
  hasSelectedEndpoint,
  uiQueryParams,
  listData,
  endpointPackageInfo,
  nonExistingPolicies,
} from './selectors';
import { EndpointState } from '../types';
import {
  sendGetEndpointSpecificPackagePolicies,
  sendGetEndpointSecurityPackage,
  sendGetAgentPolicyList,
} from '../../policy/store/policy_list/services/ingest';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../ingest_manager/common';

export const endpointMiddlewareFactory: ImmutableMiddlewareFactory<EndpointState> = (coreStart) => {
  // eslint-disable-next-line complexity
  return ({ getState, dispatch }) => (next) => async (action) => {
    next(action);

    // Endpoint list
    if (
      (action.type === 'userChangedUrl' || action.type === 'appRequestedEndpointList') &&
      isOnEndpointPage(getState()) &&
      hasSelectedEndpoint(getState()) !== true
    ) {
      if (!endpointPackageInfo(getState())) {
        try {
          const packageInfo = await sendGetEndpointSecurityPackage(coreStart.http);
          dispatch({
            type: 'serverReturnedEndpointPackageInfo',
            payload: packageInfo,
          });
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }

      const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(getState());
      let endpointResponse;

      try {
        endpointResponse = await coreStart.http.post<HostResultList>('/api/endpoint/metadata', {
          body: JSON.stringify({
            paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
          }),
        });
        endpointResponse.request_page_index = Number(pageIndex);

        dispatch({
          type: 'serverReturnedEndpointList',
          payload: endpointResponse,
        });

        try {
          const missingPolicies = await getNonExistingPoliciesForEndpointsList(
            coreStart.http,
            endpointResponse.hosts,
            nonExistingPolicies(getState())
          );
          if (missingPolicies !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointNonExistingPolicies',
              payload: missingPolicies,
            });
          }
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          // eslint-disable-next-line no-console
          console.error(error);
        }
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointList',
          payload: error,
        });
      }

      // No endpoints, so we should check to see if there are policies for onboarding
      if (endpointResponse && endpointResponse.hosts.length === 0) {
        const http = coreStart.http;

        // The original query to the list could have had an invalid param (ex. invalid page_size),
        // so we check first if endpoints actually do exist before pulling in data for the onboarding
        // messages.
        if (await doEndpointsExist(http)) {
          return;
        }

        dispatch({
          type: 'serverReturnedEndpointExistValue',
          payload: false,
        });

        try {
          const policyDataResponse: GetPolicyListResponse = await sendGetEndpointSpecificPackagePolicies(
            http,
            {
              query: {
                perPage: 50, // Since this is an oboarding flow, we'll cap at 50 policies.
                page: 1,
              },
            }
          );

          dispatch({
            type: 'serverReturnedPoliciesForOnboarding',
            payload: {
              policyItems: policyDataResponse.items,
            },
          });
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnPoliciesForOnboarding',
            payload: error.body ?? error,
          });
          return;
        }
      } else {
        dispatch({
          type: 'serverCancelledPolicyItemsLoading',
        });

        dispatch({
          type: 'serverReturnedEndpointExistValue',
          payload: true,
        });
      }
    }

    // Endpoint Details
    if (action.type === 'userChangedUrl' && hasSelectedEndpoint(getState()) === true) {
      dispatch({
        type: 'serverCancelledPolicyItemsLoading',
      });

      // If user navigated directly to a endpoint details page, load the endpoint list
      if (listData(getState()).length === 0) {
        const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(getState());
        try {
          const response = await coreStart.http.post('/api/endpoint/metadata', {
            body: JSON.stringify({
              paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
            }),
          });
          response.request_page_index = Number(pageIndex);
          dispatch({
            type: 'serverReturnedEndpointList',
            payload: response,
          });

          try {
            const missingPolicies = await getNonExistingPoliciesForEndpointsList(
              coreStart.http,
              response.hosts,
              nonExistingPolicies(getState())
            );
            if (missingPolicies !== undefined) {
              dispatch({
                type: 'serverReturnedEndpointNonExistingPolicies',
                payload: missingPolicies,
              });
            }
          } catch (error) {
            // Ignore Errors, since this should not hinder the user's ability to use the UI
            // eslint-disable-next-line no-console
            console.error(error);
          }
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnEndpointList',
            payload: error,
          });
        }
      } else {
        dispatch({
          type: 'serverCancelledEndpointListLoading',
        });
      }

      // call the endpoint details api
      const { selected_endpoint: selectedEndpoint } = uiQueryParams(getState());
      try {
        const response = await coreStart.http.get<HostInfo>(
          `/api/endpoint/metadata/${selectedEndpoint}`
        );
        dispatch({
          type: 'serverReturnedEndpointDetails',
          payload: response,
        });

        try {
          const missingPolicies = await getNonExistingPoliciesForEndpointsList(
            coreStart.http,
            [response],
            nonExistingPolicies(getState())
          );
          if (missingPolicies !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointNonExistingPolicies',
              payload: missingPolicies,
            });
          }
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          // eslint-disable-next-line no-console
          console.error(error);
        }
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointDetails',
          payload: error,
        });
      }

      // call the policy response api
      try {
        const policyResponse = await coreStart.http.get(`/api/endpoint/policy_response`, {
          query: { hostId: selectedEndpoint },
        });
        dispatch({
          type: 'serverReturnedEndpointPolicyResponse',
          payload: policyResponse,
        });
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointPolicyResponse',
          payload: error,
        });
      }
    }
  };
};

const getNonExistingPoliciesForEndpointsList = async (
  http: HttpStart,
  hosts: HostResultList['hosts'],
  currentNonExistingPolicies: EndpointState['nonExistingPolicies']
): Promise<EndpointState['nonExistingPolicies'] | undefined> => {
  if (hosts.length === 0) {
    return;
  }

  // Create an array of unique policy IDs that are not yet known to be non-existing.
  const policyIdsToCheck = Array.from(
    new Set(
      hosts
        .filter((host) => !currentNonExistingPolicies[host.metadata.Endpoint.policy.applied.id])
        .map((host) => host.metadata.Endpoint.policy.applied.id)
    )
  );

  if (policyIdsToCheck.length === 0) {
    return;
  }

  // We use the Agent Policy API here, instead of the Package Policy, because we can't use
  // filter by ID of the Saved Object. Agent Policy, however, keeps a reference (array) of
  // Package Ids that it uses, thus if a reference exists there, then the package policy (policy)
  // exists.
  const policiesFound = (
    await sendGetAgentPolicyList(http, {
      query: {
        kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${policyIdsToCheck.join(
          ' or '
        )})`,
      },
    })
  ).items.reduce<EndpointState['nonExistingPolicies']>((list, agentPolicy) => {
    (agentPolicy.package_policies as string[]).forEach((packagePolicy) => {
      list[packagePolicy as string] = true;
    });
    return list;
  }, {});

  const nonExisting = policyIdsToCheck.reduce<EndpointState['nonExistingPolicies']>(
    (list, policyId) => {
      if (policiesFound[policyId]) {
        return list;
      }
      list[policyId] = true;
      return list;
    },
    {}
  );

  if (Object.keys(nonExisting).length === 0) {
    return;
  }

  return nonExisting;
};

const doEndpointsExist = async (http: HttpStart): Promise<boolean> => {
  try {
    return (
      (
        await http.post<HostResultList>('/api/endpoint/metadata', {
          body: JSON.stringify({
            paging_properties: [{ page_index: 0 }, { page_size: 1 }],
          }),
        })
      ).hosts.length !== 0
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`error while trying to check if endpoints exist`);
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return false;
};
