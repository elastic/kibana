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
  patterns,
  searchBarQuery,
  isTransformEnabled,
} from './selectors';
import { EndpointState, PolicyIds } from '../types';
import {
  sendGetEndpointSpecificPackagePolicies,
  sendGetEndpointSecurityPackage,
  sendGetAgentPolicyList,
  sendGetFleetAgentsWithEndpoint,
} from '../../policy/store/policy_list/services/ingest';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../fleet/common';
import { metadataCurrentIndexPattern } from '../../../../../common/endpoint/constants';
import { IIndexPattern, Query } from '../../../../../../../../src/plugins/data/public';

export const endpointMiddlewareFactory: ImmutableMiddlewareFactory<EndpointState> = (
  coreStart,
  depsStart
) => {
  async function fetchIndexPatterns(): Promise<IIndexPattern[]> {
    const { indexPatterns } = depsStart.data;
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern: metadataCurrentIndexPattern,
    });
    const indexPattern: IIndexPattern = {
      title: metadataCurrentIndexPattern,
      fields,
    };
    return [indexPattern];
  }
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
        const decodedQuery: Query = searchBarQuery(getState());

        endpointResponse = await coreStart.http.post<HostResultList>('/api/endpoint/metadata', {
          body: JSON.stringify({
            paging_properties: [{ page_index: pageIndex }, { page_size: pageSize }],
            filters: { kql: decodedQuery.query },
          }),
        });
        endpointResponse.request_page_index = Number(pageIndex);

        dispatch({
          type: 'serverReturnedEndpointList',
          payload: endpointResponse,
        });

        try {
          const endpointsTotalCount = await endpointsTotal(coreStart.http);
          dispatch({
            type: 'serverReturnedEndpointsTotal',
            payload: endpointsTotalCount,
          });
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnEndpointsTotal',
            payload: error,
          });
        }

        try {
          const agentsWithEndpoint = await sendGetFleetAgentsWithEndpoint(coreStart.http);
          dispatch({
            type: 'serverReturnedAgenstWithEndpointsTotal',
            payload: agentsWithEndpoint.total,
          });
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnAgenstWithEndpointsTotal',
            payload: error,
          });
        }

        try {
          const ingestPolicies = await getAgentAndPoliciesForEndpointsList(
            coreStart.http,
            endpointResponse.hosts,
            nonExistingPolicies(getState())
          );
          if (ingestPolicies?.packagePolicy !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointNonExistingPolicies',
              payload: ingestPolicies.packagePolicy,
            });
          }
          if (ingestPolicies?.agentPolicy !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointAgentPolicies',
              payload: ingestPolicies.agentPolicy,
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

      // get index pattern and fields for search bar
      if (patterns(getState()).length === 0 && isTransformEnabled(getState())) {
        try {
          const indexPatterns = await fetchIndexPatterns();
          if (indexPatterns !== undefined) {
            dispatch({
              type: 'serverReturnedMetadataPatterns',
              payload: indexPatterns,
            });
          }
        } catch (error) {
          dispatch({
            type: 'serverFailedToReturnMetadataPatterns',
            payload: error,
          });
        }
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
            const ingestPolicies = await getAgentAndPoliciesForEndpointsList(
              coreStart.http,
              response.hosts,
              nonExistingPolicies(getState())
            );
            if (ingestPolicies?.packagePolicy !== undefined) {
              dispatch({
                type: 'serverReturnedEndpointNonExistingPolicies',
                payload: ingestPolicies.packagePolicy,
              });
            }
            if (ingestPolicies?.agentPolicy !== undefined) {
              dispatch({
                type: 'serverReturnedEndpointAgentPolicies',
                payload: ingestPolicies.agentPolicy,
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
          const ingestPolicies = await getAgentAndPoliciesForEndpointsList(
            coreStart.http,
            [response],
            nonExistingPolicies(getState())
          );
          if (ingestPolicies !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointNonExistingPolicies',
              payload: ingestPolicies.packagePolicy,
            });
          }
          if (ingestPolicies?.agentPolicy !== undefined) {
            dispatch({
              type: 'serverReturnedEndpointAgentPolicies',
              payload: ingestPolicies.agentPolicy,
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
          query: { agentId: selectedEndpoint },
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

const getAgentAndPoliciesForEndpointsList = async (
  http: HttpStart,
  hosts: HostResultList['hosts'],
  currentNonExistingPolicies: EndpointState['nonExistingPolicies']
): Promise<PolicyIds | undefined> => {
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
  ).items.reduce<PolicyIds>(
    (list, agentPolicy) => {
      (agentPolicy.package_policies as string[]).forEach((packagePolicy) => {
        list.packagePolicy[packagePolicy as string] = true;
        list.agentPolicy[packagePolicy as string] = agentPolicy.id;
      });
      return list;
    },
    { packagePolicy: {}, agentPolicy: {} }
  );

  // packagePolicy contains non-existing packagePolicy ids whereas agentPolicy contains existing agentPolicy ids
  const nonExistingPackagePoliciesAndExistingAgentPolicies = policyIdsToCheck.reduce<PolicyIds>(
    (list, policyId: string) => {
      if (policiesFound.packagePolicy[policyId as string]) {
        list.agentPolicy[policyId as string] = policiesFound.agentPolicy[policyId];
        return list;
      }
      list.packagePolicy[policyId as string] = true;
      return list;
    },
    { packagePolicy: {}, agentPolicy: {} }
  );

  if (
    Object.keys(nonExistingPackagePoliciesAndExistingAgentPolicies.packagePolicy).length === 0 &&
    Object.keys(nonExistingPackagePoliciesAndExistingAgentPolicies.agentPolicy).length === 0
  ) {
    return;
  }

  return nonExistingPackagePoliciesAndExistingAgentPolicies;
};

const endpointsTotal = async (http: HttpStart): Promise<number> => {
  try {
    return (
      await http.post<HostResultList>('/api/endpoint/metadata', {
        body: JSON.stringify({
          paging_properties: [{ page_index: 0 }, { page_size: 1 }],
        }),
      })
    ).total;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`error while trying to check for total endpoints`);
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return 0;
};

const doEndpointsExist = async (http: HttpStart): Promise<boolean> => {
  try {
    return (await endpointsTotal(http)) > 0;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`error while trying to check if endpoints exist`);
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return false;
};
