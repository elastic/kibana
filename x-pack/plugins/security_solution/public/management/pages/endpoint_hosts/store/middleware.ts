/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import { CoreStart, HttpStart } from 'kibana/public';
import {
  ActivityLog,
  HostInfo,
  HostIsolationRequestBody,
  HostIsolationResponse,
  HostResultList,
  Immutable,
  ImmutableObject,
} from '../../../../../common/endpoint/types';
import { GetPolicyListResponse } from '../../policy/types';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import {
  isOnEndpointPage,
  hasSelectedEndpoint,
  selectedAgent,
  uiQueryParams,
  listData,
  endpointPackageInfo,
  nonExistingPolicies,
  patterns,
  searchBarQuery,
  getIsIsolationRequestPending,
  getCurrentIsolationRequestState,
  getActivityLogData,
  getActivityLogDataPaging,
  getLastLoadedActivityLogData,
  detailsData,
  getIsEndpointPackageInfoUninitialized,
  getIsOnEndpointDetailsActivityLog,
  getMetadataTransformStats,
  isMetadataTransformStatsLoading,
} from './selectors';
import {
  AgentIdsPendingActions,
  EndpointState,
  PolicyIds,
  TransformStats,
  TransformStatsResponse,
} from '../types';
import {
  sendGetEndpointSpecificPackagePolicies,
  sendGetEndpointSecurityPackage,
  sendGetAgentPolicyList,
  sendGetFleetAgentsWithEndpoint,
} from '../../policy/store/services/ingest';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, PackageListItem } from '../../../../../../fleet/common';
import {
  ENDPOINT_ACTION_LOG_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  metadataCurrentIndexPattern,
} from '../../../../../common/endpoint/constants';
import { IIndexPattern, Query } from '../../../../../../../../src/plugins/data/public';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
} from '../../../state';
import { isolateHost, unIsolateHost } from '../../../../common/lib/endpoint_isolation';
import { AppAction } from '../../../../common/store/actions';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { EndpointPackageInfoStateChanged } from './action';
import { fetchPendingActionsByAgentId } from '../../../../common/lib/endpoint_pending_actions';
import { getIsInvalidDateRange } from '../utils';
import { TRANSFORM_STATS_URL } from '../../../../../common/constants';

type EndpointPageStore = ImmutableMiddlewareAPI<EndpointState, AppAction>;

// eslint-disable-next-line no-console
const logError = console.error;

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
  return (store) => (next) => async (action) => {
    next(action);

    const { getState, dispatch } = store;

    await getEndpointPackageInfo(getState(), dispatch, coreStart);

    // Endpoint list
    if (
      (action.type === 'userChangedUrl' || action.type === 'appRequestedEndpointList') &&
      isOnEndpointPage(getState()) &&
      hasSelectedEndpoint(getState()) !== true
    ) {
      const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(getState());
      let endpointResponse;

      try {
        const decodedQuery: Query = searchBarQuery(getState());

        endpointResponse = await coreStart.http.post<HostResultList>(HOST_METADATA_LIST_ROUTE, {
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

        loadEndpointsPendingActions(store);

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
          // TODO should handle the error instead of logging it to the browser
          // Also this is an anti-pattern we shouldn't use
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          logError(error);
        }
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointList',
          payload: error,
        });
      }

      // get index pattern and fields for search bar
      if (patterns(getState()).length === 0) {
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
          const response = await coreStart.http.post(HOST_METADATA_LIST_ROUTE, {
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
            // TODO should handle the error instead of logging it to the browser
            // Also this is an anti-pattern we shouldn't use
            // Ignore Errors, since this should not hinder the user's ability to use the UI
            logError(error);
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
          resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: selectedEndpoint as string })
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
          // TODO should handle the error instead of logging it to the browser
          // Also this is an anti-pattern we shouldn't use
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          logError(error);
        }
      } catch (error) {
        dispatch({
          type: 'serverFailedToReturnEndpointDetails',
          payload: error,
        });
      }

      loadEndpointsPendingActions(store);

      // call the policy response api
      try {
        const policyResponse = await coreStart.http.get(BASE_POLICY_RESPONSE_ROUTE, {
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

    if (
      action.type === 'userChangedUrl' &&
      hasSelectedEndpoint(getState()) === true &&
      getIsOnEndpointDetailsActivityLog(getState())
    ) {
      // call the activity log api
      dispatch({
        type: 'endpointDetailsActivityLogChanged',
        // ts error to be fixed when AsyncResourceState is refactored (#830)
        // @ts-expect-error
        payload: createLoadingResourceState<ActivityLog>(getActivityLogData(getState())),
      });

      try {
        const { page, pageSize } = getActivityLogDataPaging(getState());
        const route = resolvePathVariables(ENDPOINT_ACTION_LOG_ROUTE, {
          agent_id: selectedAgent(getState()),
        });
        const activityLog = await coreStart.http.get<ActivityLog>(route, {
          query: { page, page_size: pageSize },
        });
        dispatch({
          type: 'endpointDetailsActivityLogChanged',
          payload: createLoadedResourceState<ActivityLog>(activityLog),
        });
      } catch (error) {
        dispatch({
          type: 'endpointDetailsActivityLogChanged',
          payload: createFailedResourceState<ActivityLog>(error.body ?? error),
        });
      }
    }

    // page activity log API
    if (
      action.type === 'endpointDetailsActivityLogUpdatePaging' &&
      hasSelectedEndpoint(getState())
    ) {
      try {
        const { disabled, page, pageSize, startDate, endDate } = getActivityLogDataPaging(
          getState()
        );
        // don't page when paging is disabled or when date ranges are invalid
        if (disabled) {
          return;
        }
        if (getIsInvalidDateRange({ startDate, endDate })) {
          dispatch({
            type: 'endpointDetailsActivityLogUpdateIsInvalidDateRange',
            payload: {
              isInvalidDateRange: true,
            },
          });
          return;
        }

        dispatch({
          type: 'endpointDetailsActivityLogUpdateIsInvalidDateRange',
          payload: {
            isInvalidDateRange: false,
          },
        });
        dispatch({
          type: 'endpointDetailsActivityLogChanged',
          // ts error to be fixed when AsyncResourceState is refactored (#830)
          // @ts-expect-error
          payload: createLoadingResourceState<ActivityLog>(getActivityLogData(getState())),
        });
        const route = resolvePathVariables(ENDPOINT_ACTION_LOG_ROUTE, {
          agent_id: selectedAgent(getState()),
        });
        const activityLog = await coreStart.http.get<ActivityLog>(route, {
          query: {
            page,
            page_size: pageSize,
            start_date: startDate,
            end_date: endDate,
          },
        });

        const lastLoadedLogData = getLastLoadedActivityLogData(getState());
        if (lastLoadedLogData !== undefined) {
          const updatedLogDataItems = ([
            ...new Set([...lastLoadedLogData.data, ...activityLog.data]),
          ] as ActivityLog['data']).sort((a, b) =>
            new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
          );

          const updatedLogData = {
            page: activityLog.page,
            pageSize: activityLog.pageSize,
            startDate: activityLog.startDate,
            endDate: activityLog.endDate,
            data: activityLog.page === 1 ? activityLog.data : updatedLogDataItems,
          };
          dispatch({
            type: 'endpointDetailsActivityLogChanged',
            payload: createLoadedResourceState<ActivityLog>(updatedLogData),
          });
          if (!activityLog.data.length) {
            dispatch({
              type: 'endpointDetailsActivityLogUpdatePaging',
              payload: {
                disabled: true,
                page: activityLog.page > 1 ? activityLog.page - 1 : 1,
                pageSize: activityLog.pageSize,
                startDate: activityLog.startDate,
                endDate: activityLog.endDate,
              },
            });
          }
        } else {
          dispatch({
            type: 'endpointDetailsActivityLogChanged',
            payload: createLoadedResourceState<ActivityLog>(activityLog),
          });
        }
      } catch (error) {
        dispatch({
          type: 'endpointDetailsActivityLogChanged',
          payload: createFailedResourceState<ActivityLog>(error.body ?? error),
        });
      }
    }

    // Isolate Host
    if (action.type === 'endpointIsolationRequest') {
      return handleIsolateEndpointHost(store, action);
    }

    if (action.type === 'loadMetadataTransformStats') {
      return handleLoadMetadataTransformStats(coreStart.http, store);
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
  const policyIdsToCheck = [
    ...new Set(
      hosts.reduce((acc: string[], host) => {
        const appliedPolicyId = host.metadata.Endpoint.policy.applied.id;
        if (!currentNonExistingPolicies[appliedPolicyId]) {
          acc.push(appliedPolicyId);
        }
        return acc;
      }, [])
    ),
  ];

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
      await http.post<HostResultList>(HOST_METADATA_LIST_ROUTE, {
        body: JSON.stringify({
          paging_properties: [{ page_index: 0 }, { page_size: 1 }],
        }),
      })
    ).total;
  } catch (error) {
    // TODO should handle the error instead of logging it to the browser
    // Also this is an anti-pattern we shouldn't use
    logError(`error while trying to check for total endpoints`);
    logError(error);
  }
  return 0;
};

const doEndpointsExist = async (http: HttpStart): Promise<boolean> => {
  try {
    return (await endpointsTotal(http)) > 0;
  } catch (error) {
    // TODO should handle the error instead of logging it to the browser
    // Also this is an anti-pattern we shouldn't use
    logError(`error while trying to check if endpoints exist`);
    logError(error);
  }
  return false;
};

const handleIsolateEndpointHost = async (
  { getState, dispatch }: EndpointPageStore,
  action: Immutable<AppAction & { type: 'endpointIsolationRequest' }>
) => {
  const state = getState();

  if (getIsIsolationRequestPending(state)) {
    return;
  }

  dispatch({
    type: 'endpointIsolationRequestStateChange',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState(getCurrentIsolationRequestState(state)),
  });

  try {
    // Cast needed below due to the value of payload being `Immutable<>`
    let response: HostIsolationResponse;

    if (action.payload.type === 'unisolate') {
      response = await unIsolateHost(action.payload.data as HostIsolationRequestBody);
    } else {
      response = await isolateHost(action.payload.data as HostIsolationRequestBody);
    }

    dispatch({
      type: 'endpointIsolationRequestStateChange',
      payload: createLoadedResourceState<HostIsolationResponse>(response),
    });
  } catch (error) {
    dispatch({
      type: 'endpointIsolationRequestStateChange',
      payload: createFailedResourceState<HostIsolationResponse>(error.body ?? error),
    });
  }
};

async function getEndpointPackageInfo(
  state: ImmutableObject<EndpointState>,
  dispatch: Dispatch<EndpointPackageInfoStateChanged>,
  coreStart: CoreStart
) {
  if (!getIsEndpointPackageInfoUninitialized(state)) return;

  dispatch({
    type: 'endpointPackageInfoStateChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState<PackageListItem>(endpointPackageInfo(state)),
  });

  try {
    const packageInfo = await sendGetEndpointSecurityPackage(coreStart.http);
    dispatch({
      type: 'endpointPackageInfoStateChanged',
      payload: createLoadedResourceState(packageInfo),
    });
  } catch (error) {
    // TODO should handle the error instead of logging it to the browser
    // Also this is an anti-pattern we shouldn't use
    // Ignore Errors, since this should not hinder the user's ability to use the UI
    logError(error);
    dispatch({
      type: 'endpointPackageInfoStateChanged',
      payload: createFailedResourceState(error),
    });
  }
}

/**
 * retrieves the Endpoint pending actions for all of the existing endpoints being displayed on the list
 * or the details tab.
 *
 * @param store
 */
const loadEndpointsPendingActions = async ({
  getState,
  dispatch,
}: EndpointPageStore): Promise<void> => {
  const state = getState();
  const detailsEndpoint = detailsData(state);
  const listEndpoints = listData(state);
  const agentsIds = new Set<string>();

  // get all agent ids for the endpoints in the list
  if (detailsEndpoint) {
    agentsIds.add(detailsEndpoint.elastic.agent.id);
  }

  for (const endpointInfo of listEndpoints) {
    agentsIds.add(endpointInfo.metadata.elastic.agent.id);
  }

  if (agentsIds.size === 0) {
    return;
  }

  try {
    const { data: pendingActions } = await fetchPendingActionsByAgentId(Array.from(agentsIds));
    const agentIdToPendingActions: AgentIdsPendingActions = new Map();

    for (const pendingAction of pendingActions) {
      agentIdToPendingActions.set(pendingAction.agent_id, pendingAction.pending_actions);
    }

    dispatch({
      type: 'endpointPendingActionsStateChanged',
      payload: createLoadedResourceState(agentIdToPendingActions),
    });
  } catch (error) {
    // TODO should handle the error instead of logging it to the browser
    // Also this is an anti-pattern we shouldn't use
    logError(error);
  }
};

export async function handleLoadMetadataTransformStats(http: HttpStart, store: EndpointPageStore) {
  const { getState, dispatch } = store;

  if (!http || !getState || !dispatch) {
    return;
  }

  const state = getState();
  if (isMetadataTransformStatsLoading(state)) return;

  dispatch({
    type: 'metadataTransformStatsChanged',
    // ts error to be fixed when AsyncResourceState is refactored (#830)
    // @ts-expect-error
    payload: createLoadingResourceState<TransformStats[]>(getMetadataTransformStats(state)),
  });

  try {
    const transformStatsResponse: TransformStatsResponse = await http.get(TRANSFORM_STATS_URL);

    dispatch({
      type: 'metadataTransformStatsChanged',
      payload: createLoadedResourceState<TransformStats[]>(transformStatsResponse.transforms),
    });
  } catch (error) {
    dispatch({
      type: 'metadataTransformStatsChanged',
      payload: createFailedResourceState<TransformStats[]>(error),
    });
  }
}
