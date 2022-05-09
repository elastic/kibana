/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, Query } from '@kbn/es-query';
import { CoreStart, HttpStart } from '@kbn/core/public';
import { Dispatch } from 'redux';
import semverGte from 'semver/functions/gte';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import {
  BASE_POLICY_RESPONSE_ROUTE,
  ENDPOINT_ACTION_LOG_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  metadataCurrentIndexPattern,
  METADATA_UNITED_INDEX,
  METADATA_TRANSFORMS_STATUS_ROUTE,
} from '../../../../../common/endpoint/constants';
import {
  ActivityLog,
  GetHostPolicyResponse,
  HostInfo,
  HostIsolationRequestBody,
  HostIsolationResponse,
  HostResultList,
  Immutable,
  ImmutableObject,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import { isolateHost, unIsolateHost } from '../../../../common/lib/endpoint_isolation';
import { fetchPendingActionsByAgentId } from '../../../../common/lib/endpoint_pending_actions';
import { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import {
  asStaleResourceState,
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
} from '../../../state';
import {
  sendGetAgentPolicyList,
  sendGetEndpointSecurityPackage,
  sendGetFleetAgentsWithEndpoint,
} from '../../../services/policies/ingest';
import { GetPolicyListResponse } from '../../policy/types';
import {
  AgentIdsPendingActions,
  EndpointState,
  PolicyIds,
  TransformStats,
  TransformStatsResponse,
} from '../types';
import { getIsInvalidDateRange } from '../utils';
import { EndpointPackageInfoStateChanged } from './action';
import {
  detailsData,
  endpointPackageInfo,
  endpointPackageVersion,
  getActivityLogData,
  getActivityLogDataPaging,
  getActivityLogError,
  getActivityLogIsUninitializedOrHasSubsequentAPIError,
  getCurrentIsolationRequestState,
  getIsEndpointPackageInfoUninitialized,
  getIsIsolationRequestPending,
  getIsOnEndpointDetailsActivityLog,
  getLastLoadedActivityLogData,
  getMetadataTransformStats,
  hasSelectedEndpoint,
  isMetadataTransformStatsLoading,
  isOnEndpointPage,
  listData,
  nonExistingPolicies,
  patterns,
  searchBarQuery,
  selectedAgent,
  uiQueryParams,
} from './selectors';

type EndpointPageStore = ImmutableMiddlewareAPI<EndpointState, AppAction>;

// eslint-disable-next-line no-console
const logError = console.error;

export const endpointMiddlewareFactory: ImmutableMiddlewareFactory<EndpointState> = (
  coreStart,
  depsStart
) => {
  // this needs to be called after endpointPackageVersion is loaded (getEndpointPackageInfo)
  // or else wrong pattern might be loaded
  async function fetchIndexPatterns(
    state: ImmutableObject<EndpointState>
  ): Promise<DataViewBase[]> {
    const packageVersion = endpointPackageVersion(state) ?? '';
    const parsedPackageVersion = packageVersion.includes('-')
      ? packageVersion.substring(0, packageVersion.indexOf('-'))
      : packageVersion;
    const minUnitedIndexVersion = '1.2.0';
    const indexPatternToFetch = semverGte(parsedPackageVersion, minUnitedIndexVersion)
      ? METADATA_UNITED_INDEX
      : metadataCurrentIndexPattern;

    const { indexPatterns } = depsStart.data;
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern: indexPatternToFetch,
    });
    const indexPattern: DataViewBase = {
      title: indexPatternToFetch,
      fields,
    };
    return [indexPattern];
  }
  return (store) => (next) => async (action) => {
    next(action);

    const { getState, dispatch } = store;

    await getEndpointPackageInfo(getState(), dispatch, coreStart);

    // Endpoint list
    if (
      (action.type === 'userChangedUrl' || action.type === 'appRequestedEndpointList') &&
      isOnEndpointPage(getState()) &&
      !hasSelectedEndpoint(getState())
    ) {
      await endpointDetailsListMiddleware({ coreStart, store, fetchIndexPatterns });
    }

    // Endpoint Details
    if (action.type === 'userChangedUrl' && hasSelectedEndpoint(getState())) {
      const { selected_endpoint: selectedEndpoint } = uiQueryParams(getState());
      await endpointDetailsMiddleware({ store, coreStart, selectedEndpoint });
    }

    if (action.type === 'endpointDetailsLoad') {
      await loadEndpointDetails({ store, coreStart, selectedEndpoint: action.payload.endpointId });
    }

    // get activity log API
    if (
      action.type === 'userChangedUrl' &&
      hasSelectedEndpoint(getState()) === true &&
      getIsOnEndpointDetailsActivityLog(getState()) &&
      getActivityLogIsUninitializedOrHasSubsequentAPIError(getState())
    ) {
      await endpointDetailsActivityLogChangedMiddleware({ store, coreStart });
    }

    // page activity log API
    if (
      action.type === 'endpointDetailsActivityLogUpdatePaging' &&
      !getActivityLogError(getState()) &&
      hasSelectedEndpoint(getState())
    ) {
      await endpointDetailsActivityLogPagingMiddleware({ store, coreStart });
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
      await http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        query: {
          page: 0,
          pageSize: 1,
        },
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
    payload: createLoadingResourceState(
      asStaleResourceState(getCurrentIsolationRequestState(state))
    ),
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
    payload: createLoadingResourceState(asStaleResourceState(endpointPackageInfo(state))),
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

async function endpointDetailsListMiddleware({
  store,
  coreStart,
  fetchIndexPatterns,
}: {
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
  coreStart: CoreStart;
  fetchIndexPatterns: (state: ImmutableObject<EndpointState>) => Promise<DataViewBase[]>;
}) {
  const { getState, dispatch } = store;

  const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(getState());
  let endpointResponse: MetadataListResponse | undefined;

  try {
    const decodedQuery: Query = searchBarQuery(getState());

    endpointResponse = await coreStart.http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
      query: {
        page: pageIndex,
        pageSize,
        kuery: decodedQuery.query as string,
      },
    });

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

    dispatchIngestPolicies({ http: coreStart.http, hosts: endpointResponse.data, store });
  } catch (error) {
    dispatch({
      type: 'serverFailedToReturnEndpointList',
      payload: error,
    });
  }

  // get index pattern and fields for search bar
  if (patterns(getState()).length === 0) {
    try {
      const indexPatterns = await fetchIndexPatterns(getState());
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
  if (endpointResponse && endpointResponse.data.length === 0) {
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
      const policyDataResponse: GetPolicyListResponse =
        await sendGetEndpointSpecificPackagePolicies(http, {
          query: {
            perPage: 50, // Since this is an oboarding flow, we'll cap at 50 policies.
            page: 1,
          },
        });

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

async function loadEndpointDetails({
  selectedEndpoint,
  store,
  coreStart,
}: {
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
  coreStart: CoreStart;
  selectedEndpoint: string;
}) {
  const { getState, dispatch } = store;
  // call the endpoint details api
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
    const policyResponse = await coreStart.http.get<GetHostPolicyResponse>(
      BASE_POLICY_RESPONSE_ROUTE,
      { query: { agentId: selectedEndpoint } }
    );
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

async function endpointDetailsMiddleware({
  coreStart,
  selectedEndpoint,
  store,
}: {
  coreStart: CoreStart;
  selectedEndpoint?: string;
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
}) {
  const { getState, dispatch } = store;
  dispatch({
    type: 'serverCancelledPolicyItemsLoading',
  });

  // If user navigated directly to a endpoint details page, load the endpoint list
  if (listData(getState()).length === 0) {
    const { page_index: pageIndex, page_size: pageSize } = uiQueryParams(getState());
    try {
      const response = await coreStart.http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        query: {
          page: pageIndex,
          pageSize,
        },
      });

      dispatch({
        type: 'serverReturnedEndpointList',
        payload: response,
      });

      dispatchIngestPolicies({ http: coreStart.http, hosts: response.data, store });
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
  if (typeof selectedEndpoint === 'undefined') {
    return;
  }
  await loadEndpointDetails({ store, coreStart, selectedEndpoint });
}

async function endpointDetailsActivityLogChangedMiddleware({
  store,
  coreStart,
}: {
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
  coreStart: CoreStart;
}) {
  const { getState, dispatch } = store;
  dispatch({
    type: 'endpointDetailsActivityLogChanged',
    payload: createLoadingResourceState(asStaleResourceState(getActivityLogData(getState()))),
  });

  try {
    const { page, pageSize, startDate, endDate } = getActivityLogDataPaging(getState());
    const route = resolvePathVariables(ENDPOINT_ACTION_LOG_ROUTE, {
      agent_id: selectedAgent(getState()),
    });
    const activityLog = await coreStart.http.get<ActivityLog>(route, {
      query: { page, page_size: pageSize, start_date: startDate, end_date: endDate },
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

async function endpointDetailsActivityLogPagingMiddleware({
  store,
  coreStart,
}: {
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
  coreStart: CoreStart;
}) {
  const { getState, dispatch } = store;
  try {
    const { disabled, page, pageSize, startDate, endDate } = getActivityLogDataPaging(getState());
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
      payload: createLoadingResourceState(asStaleResourceState(getActivityLogData(getState()))),
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
      const updatedLogDataItems = (
        [...new Set([...lastLoadedLogData.data, ...activityLog.data])] as ActivityLog['data']
      ).sort((a, b) =>
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

export async function handleLoadMetadataTransformStats(http: HttpStart, store: EndpointPageStore) {
  const { getState, dispatch } = store;

  if (!http || !getState || !dispatch) {
    return;
  }

  const state = getState();
  if (isMetadataTransformStatsLoading(state)) return;

  dispatch({
    type: 'metadataTransformStatsChanged',
    payload: createLoadingResourceState(asStaleResourceState(getMetadataTransformStats(state))),
  });

  try {
    const transformStatsResponse: TransformStatsResponse = await http.get(
      METADATA_TRANSFORMS_STATUS_ROUTE
    );

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

async function dispatchIngestPolicies({
  store,
  hosts,
  http,
}: {
  store: EndpointPageStore;
  hosts: HostResultList['hosts'];
  http: HttpStart;
}) {
  const { getState, dispatch } = store;
  try {
    const ingestPolicies = await getAgentAndPoliciesForEndpointsList(
      http,
      hosts,
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
}
