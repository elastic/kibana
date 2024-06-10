/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { DataViewBase, Query } from '@kbn/es-query';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { Dispatch } from 'redux';
import semverGte from 'semver/functions/gte';
import type {
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '@kbn/timelines-plugin/common';
import {
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
} from '../../../../../common/endpoint/constants';
import type {
  HostIsolationRequestBody,
  HostResultList,
  Immutable,
  ImmutableObject,
  MetadataListResponse,
  ResponseActionApiResponse,
} from '../../../../../common/endpoint/types';
import { isolateHost, unIsolateHost } from '../../../../common/lib/endpoint_isolation';
import { fetchPendingActionsByAgentId } from '../../../../common/lib/endpoint_pending_actions';
import type { ImmutableMiddlewareAPI, ImmutableMiddlewareFactory } from '../../../../common/store';
import type { AppAction } from '../../../../common/store/actions';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import {
  asStaleResourceState,
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
} from '../../../state';
import {
  sendBulkGetPackagePolicies,
  sendGetEndpointSecurityPackage,
} from '../../../services/policies/ingest';
import type { GetPolicyListResponse } from '../../policy/types';
import type {
  AgentIdsPendingActions,
  EndpointState,
  PolicyIds,
  TransformStats,
  TransformStatsResponse,
} from '../types';
import type { EndpointPackageInfoStateChanged } from './action';
import {
  endpointPackageInfo,
  endpointPackageVersion,
  getCurrentIsolationRequestState,
  getIsEndpointPackageInfoUninitialized,
  getIsIsolationRequestPending,
  getMetadataTransformStats,
  isMetadataTransformStatsLoading,
  isOnEndpointPage,
  listData,
  nonExistingPolicies,
  patterns,
  searchBarQuery,
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
  // or else the wrong pattern might be loaded
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

    const res$ = depsStart.data.search.search<
      IndexFieldsStrategyRequest<'indices'>,
      IndexFieldsStrategyResponse
    >(
      { indices: [indexPatternToFetch], onlyCheckIfIndicesExist: false },
      {
        strategy: ENDPOINT_FIELDS_SEARCH_STRATEGY,
      }
    );
    const response = await firstValueFrom(res$);
    const indexPattern: DataViewBase = {
      title: indexPatternToFetch,
      fields: response.indexFields,
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
      isOnEndpointPage(getState())
    ) {
      await endpointListMiddleware({ coreStart, store, fetchIndexPatterns });
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
    await sendBulkGetPackagePolicies(http, policyIdsToCheck)
  ).items.reduce<PolicyIds>(
    (list, packagePolicy) => {
      list.packagePolicy[packagePolicy.id as string] = true;
      list.agentPolicy[packagePolicy.id as string] = packagePolicy.policy_ids[0]; // TODO

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
        version: '2023-10-31',
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
    let response: ResponseActionApiResponse;

    if (action.payload.type === 'unisolate') {
      response = await unIsolateHost(action.payload.data as HostIsolationRequestBody);
    } else {
      response = await isolateHost(action.payload.data as HostIsolationRequestBody);
    }

    dispatch({
      type: 'endpointIsolationRequestStateChange',
      payload: createLoadedResourceState<ResponseActionApiResponse>(response),
    });
  } catch (error) {
    dispatch({
      type: 'endpointIsolationRequestStateChange',
      payload: createFailedResourceState<ResponseActionApiResponse>(error.body ?? error),
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
 * retrieves the Endpoint pending actions for all the existing endpoints being displayed on the list
 * or the details tab.
 *
 * @param store
 */
const loadEndpointsPendingActions = async ({
  getState,
  dispatch,
}: EndpointPageStore): Promise<void> => {
  const state = getState();
  const listEndpoints = listData(state);
  const agentsIds = new Set<string>();

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

async function endpointListMiddleware({
  store,
  coreStart,
  fetchIndexPatterns,
}: {
  store: ImmutableMiddlewareAPI<EndpointState, AppAction>;
  coreStart: CoreStart;
  fetchIndexPatterns: (state: ImmutableObject<EndpointState>) => Promise<DataViewBase[]>;
}) {
  const { getState, dispatch } = store;

  const {
    page_index: pageIndex,
    page_size: pageSize,
    sort_field: sortField,
    sort_direction: sortDirection,
  } = uiQueryParams(getState());
  let endpointResponse: MetadataListResponse | undefined;

  try {
    const decodedQuery: Query = searchBarQuery(getState());

    endpointResponse = await coreStart.http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
      version: '2023-10-31',
      query: {
        page: pageIndex,
        pageSize,
        kuery: decodedQuery.query as string,
        sortField,
        sortDirection,
      },
    });

    dispatch({
      type: 'serverReturnedEndpointList',
      payload: endpointResponse,
    });

    loadEndpointsPendingActions(store);

    dispatchIngestPolicies({ http: coreStart.http, hosts: endpointResponse.data, store });
  } catch (error) {
    dispatch({
      type: 'serverFailedToReturnEndpointList',
      payload: error,
    });
  }

  // get an index pattern and fields for search bar
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
      dispatch({
        type: 'serverFinishedInitialization',
        payload: true,
      });
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
            perPage: 50, // Since this is an onboarding flow, we'll cap at 50 policies.
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

  dispatch({
    type: 'serverFinishedInitialization',
    payload: true,
  });
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
      METADATA_TRANSFORMS_STATUS_ROUTE,
      { version: '2023-10-31' }
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
