/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import {
  GetPolicyListResponse,
  MiddlewareRunner,
  MiddlewareRunnerContext,
  PolicyAssignedTrustedApps,
  PolicyDetailsState,
  PolicyDetailsStore,
  PolicyRemoveTrustedApps,
} from '../../../types';
import {
  doesPolicyTrustedAppsListNeedUpdate,
  getCurrentArtifactsLocation,
  getCurrentPolicyAssignedTrustedAppsState,
  getCurrentTrustedAppsRemoveListState,
  getCurrentUrlLocationPaginationParams,
  getLatestLoadedPolicyAssignedTrustedAppsState,
  getTrustedAppsIsRemoving,
  getTrustedAppsPolicyListState,
  isOnPolicyTrustedAppsView,
  isPolicyTrustedAppListLoading,
  licensedPolicy,
  policyIdFromParams,
  getDoesAnyTrustedAppExistsIsLoading,
} from '../selectors';
import {
  Immutable,
  MaybeImmutable,
  PutTrustedAppUpdateResponse,
  TrustedApp,
} from '../../../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI } from '../../../../../../common/store';
import { TrustedAppsService } from '../../../../trusted_apps/service';
import {
  createFailedResourceState,
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  isLoadingResourceState,
  isUninitialisedResourceState,
} from '../../../../../state';
import { parseQueryFilterToKQL } from '../../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../../trusted_apps/constants';
import { PolicyDetailsAction } from '../action';
import { ServerApiError } from '../../../../../../common/types';

/** Runs all middleware actions associated with the Trusted Apps view in Policy Details */
export const policyTrustedAppsMiddlewareRunner: MiddlewareRunner = async (
  context,
  store,
  action
) => {
  const state = store.getState();

  /* -----------------------------------------------------------
     If not on the Trusted Apps Policy view, then just return
     ----------------------------------------------------------- */
  if (!isOnPolicyTrustedAppsView(state)) {
    return;
  }

  const { trustedAppsService } = context;

  switch (action.type) {
    case 'userChangedUrl':
      fetchPolicyTrustedAppsIfNeeded(context, store);
      fetchAllPoliciesIfNeeded(context, store);

      if (action.type === 'userChangedUrl' && getCurrentArtifactsLocation(state).show === 'list') {
        await searchTrustedApps(store, trustedAppsService);
      }

      break;

    case 'policyDetailsTrustedAppsForceListDataRefresh':
      fetchPolicyTrustedAppsIfNeeded(context, store, true);
      break;

    case 'policyArtifactsUpdateTrustedApps':
      if (
        getCurrentArtifactsLocation(state).show === 'list' &&
        action.payload.action === 'assign'
      ) {
        await updateTrustedApps(store, trustedAppsService, action.payload.artifacts);
      } else if (action.payload.action === 'remove') {
        removeTrustedAppsFromPolicy(context, store, action.payload.artifacts);
      }

      break;

    case 'policyArtifactsAssignableListPageDataFilter':
      if (getCurrentArtifactsLocation(state).show === 'list') {
        await searchTrustedApps(store, trustedAppsService, action.payload.filter);
      }

      break;
  }
};

const checkIfThereAreAssignableTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService
) => {
  const state = store.getState();
  const policyId = policyIdFromParams(state);

  store.dispatch({
    type: 'policyArtifactsAssignableListExistDataChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-expect-error TS2345
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });
  try {
    const trustedApps = await trustedAppsService.getTrustedAppsList({
      page: 1,
      per_page: 100,
      kuery: `(not exception-list-agnostic.attributes.tags:"policy:${policyId}") AND (not exception-list-agnostic.attributes.tags:"policy:all")`,
    });

    store.dispatch({
      type: 'policyArtifactsAssignableListExistDataChanged',
      payload: createLoadedResourceState(!isEmpty(trustedApps.data)),
    });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsAssignableListExistDataChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-expect-error TS2741
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

const checkIfAnyTrustedApp = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService
) => {
  const state = store.getState();
  if (getDoesAnyTrustedAppExistsIsLoading(state)) {
    return;
  }
  store.dispatch({
    type: 'policyArtifactsDeosAnyTrustedAppExists',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });
  try {
    const trustedApps = await trustedAppsService.getTrustedAppsList({
      page: 1,
      per_page: 100,
    });

    store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedAppExists',
      payload: createLoadedResourceState(!isEmpty(trustedApps.data)),
    });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedAppExists',
      payload: createFailedResourceState<boolean>(err.body ?? err),
    });
  }
};

const searchTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService,
  filter?: string
) => {
  const state = store.getState();
  const policyId = policyIdFromParams(state);

  store.dispatch({
    type: 'policyArtifactsAssignableListPageDataChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-expect-error TS2345
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });

  try {
    const kuery = [
      `(not exception-list-agnostic.attributes.tags:"policy:${policyId}") AND (not exception-list-agnostic.attributes.tags:"policy:all")`,
    ];

    if (filter) {
      const filterKuery = parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) || undefined;
      if (filterKuery) kuery.push(filterKuery);
    }

    const trustedApps = await trustedAppsService.getTrustedAppsList({
      page: 1,
      per_page: 100,
      kuery: kuery.join(' AND '),
    });

    store.dispatch({
      type: 'policyArtifactsAssignableListPageDataChanged',
      payload: createLoadedResourceState(trustedApps),
    });

    if (isEmpty(trustedApps.data)) {
      checkIfThereAreAssignableTrustedApps(store, trustedAppsService);
    }
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsAssignableListPageDataChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-expect-error TS2322
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

const updateTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService,
  trustedApps: MaybeImmutable<TrustedApp[]>
) => {
  const state = store.getState();
  const policyId = policyIdFromParams(state);

  store.dispatch({
    type: 'policyArtifactsUpdateTrustedAppsChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-expect-error
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });

  try {
    const updatedTrustedApps = await trustedAppsService.assignPolicyToTrustedApps(
      policyId,
      trustedApps
    );

    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      payload: createLoadedResourceState(updatedTrustedApps),
    });

    store.dispatch({ type: 'policyDetailsTrustedAppsForceListDataRefresh' });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      payload: createFailedResourceState<PutTrustedAppUpdateResponse[]>(err.body ?? err),
    });
  }
};

const fetchPolicyTrustedAppsIfNeeded = async (
  { trustedAppsService }: MiddlewareRunnerContext,
  { getState, dispatch }: PolicyDetailsStore,
  forceFetch: boolean = false
) => {
  const state = getState();

  if (isPolicyTrustedAppListLoading(state)) {
    return;
  }

  if (forceFetch || doesPolicyTrustedAppsListNeedUpdate(state)) {
    dispatch({
      type: 'assignedTrustedAppsListStateChanged',
      // @ts-ignore will be fixed when AsyncResourceState is refactored (#830)
      payload: createLoadingResourceState(getCurrentPolicyAssignedTrustedAppsState(state)),
    });

    try {
      const urlLocationData = getCurrentUrlLocationPaginationParams(state);
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
      if (!fetchResponse.total) {
        await checkIfAnyTrustedApp({ getState, dispatch }, trustedAppsService);
      }
    } catch (error) {
      dispatch({
        type: 'assignedTrustedAppsListStateChanged',
        payload: createFailedResourceState<Immutable<PolicyAssignedTrustedApps>>(
          error as ServerApiError,
          getLatestLoadedPolicyAssignedTrustedAppsState(getState())
        ),
      });
    }
  }
};

const fetchAllPoliciesIfNeeded = async (
  { trustedAppsService }: MiddlewareRunnerContext,
  { getState, dispatch }: PolicyDetailsStore
) => {
  const state = getState();
  const currentPoliciesState = getTrustedAppsPolicyListState(state);
  const isLoading = isLoadingResourceState(currentPoliciesState);
  const hasBeenLoaded = !isUninitialisedResourceState(currentPoliciesState);

  if (isLoading || hasBeenLoaded) {
    return;
  }

  dispatch({
    type: 'policyDetailsListOfAllPoliciesStateChanged',
    // @ts-ignore will be fixed when AsyncResourceState is refactored (#830)
    payload: createLoadingResourceState(currentPoliciesState),
  });

  try {
    const policyList = await trustedAppsService.getPolicyList({
      query: {
        page: 1,
        perPage: 1000,
      },
    });

    dispatch({
      type: 'policyDetailsListOfAllPoliciesStateChanged',
      payload: createLoadedResourceState(policyList),
    });
  } catch (error) {
    dispatch({
      type: 'policyDetailsListOfAllPoliciesStateChanged',
      payload: createFailedResourceState<GetPolicyListResponse>(error.body || error),
    });
  }
};

const removeTrustedAppsFromPolicy = async (
  { trustedAppsService }: MiddlewareRunnerContext,
  { getState, dispatch }: PolicyDetailsStore,
  trustedApps: MaybeImmutable<TrustedApp[]>
): Promise<void> => {
  const state = getState();

  if (getTrustedAppsIsRemoving(state)) {
    return;
  }

  dispatch({
    type: 'policyDetailsTrustedAppsRemoveListStateChanged',
    // @ts-expect-error will be fixed when AsyncResourceState is refactored (#830)
    payload: createLoadingResourceState(getCurrentTrustedAppsRemoveListState(state)),
  });

  try {
    const currentPolicyId = licensedPolicy(state)?.id;

    if (!currentPolicyId) {
      throw new Error('current policy id not found');
    }

    const response = await trustedAppsService.removePolicyFromTrustedApps(
      currentPolicyId,
      trustedApps
    );

    dispatch({
      type: 'policyDetailsTrustedAppsRemoveListStateChanged',
      payload: createLoadedResourceState({ artifacts: trustedApps, response }),
    });

    dispatch({
      type: 'policyDetailsTrustedAppsForceListDataRefresh',
    });
  } catch (error) {
    dispatch({
      type: 'policyDetailsTrustedAppsRemoveListStateChanged',
      payload: createFailedResourceState<PolicyRemoveTrustedApps>(error.body || error),
    });
  }
};
