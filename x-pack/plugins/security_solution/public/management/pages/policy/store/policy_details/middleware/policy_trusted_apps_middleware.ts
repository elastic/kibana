/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { find, isEmpty } from 'lodash/fp';
import {
  PolicyDetailsState,
  MiddlewareRunner,
  GetPolicyListResponse,
  MiddlewareRunnerContext,
  PolicyAssignedTrustedApps,
  PolicyDetailsStore,
} from '../../../types';
import {
  policyIdFromParams,
  getAssignableArtifactsList,
  doesPolicyTrustedAppsListNeedUpdate,
  getCurrentPolicyAssignedTrustedAppsState,
  getLatestLoadedPolicyAssignedTrustedAppsState,
  getTrustedAppsPolicyListState,
  isPolicyTrustedAppListLoading,
  getCurrentArtifactsLocation,
  isOnPolicyTrustedAppsView,
  getCurrentUrlLocationPaginationParams,
  getDoesAnyTrustedAppExistsIsLoading,
} from '../selectors';
import {
  ImmutableArray,
  ImmutableObject,
  PostTrustedAppCreateRequest,
  TrustedApp,
  Immutable,
} from '../../../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI } from '../../../../../../common/store';
import { TrustedAppsService } from '../../../../trusted_apps/service';
import {
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  createFailedResourceState,
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
      if (getCurrentArtifactsLocation(state).show === 'list') {
        await updateTrustedApps(store, trustedAppsService, action.payload.trustedAppIds);
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
    // @ts-ignore
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
      // @ts-ignore
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
    // @ts-ignore
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
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

interface UpdateTrustedAppWrapperProps {
  entry: ImmutableObject<TrustedApp>;
  policies: ImmutableArray<string>;
}

const updateTrustedApps = async (
  store: ImmutableMiddlewareAPI<PolicyDetailsState, PolicyDetailsAction>,
  trustedAppsService: TrustedAppsService,
  trustedAppsIds: ImmutableArray<string>
) => {
  const state = store.getState();
  const policyId = policyIdFromParams(state);
  const availavleArtifacts = getAssignableArtifactsList(state);

  if (!availavleArtifacts || !availavleArtifacts.data.length) {
    return;
  }

  store.dispatch({
    type: 'policyArtifactsUpdateTrustedAppsChanged',
    // Ignore will be fixed with when AsyncResourceState is refactored (#830)
    // @ts-ignore
    payload: createLoadingResourceState({ previousState: createUninitialisedResourceState() }),
  });

  try {
    const trustedAppsUpdateActions = [];

    const updateTrustedApp = async ({ entry, policies }: UpdateTrustedAppWrapperProps) =>
      trustedAppsService.updateTrustedApp({ id: entry.id }, {
        effectScope: { type: 'policy', policies: [...policies, policyId] },
        name: entry.name,
        entries: entry.entries,
        os: entry.os,
        description: entry.description,
        version: entry.version,
      } as PostTrustedAppCreateRequest);

    for (const entryId of trustedAppsIds) {
      const entry = find({ id: entryId }, availavleArtifacts.data) as ImmutableObject<TrustedApp>;
      if (entry) {
        const policies = entry.effectScope.type === 'policy' ? entry.effectScope.policies : [];
        trustedAppsUpdateActions.push({ entry, policies });
      }
    }

    const updatedTrustedApps = await pMap(trustedAppsUpdateActions, updateTrustedApp, {
      concurrency: 5,
      /** When set to false, instead of stopping when a promise rejects, it will wait for all the promises to settle
       * and then reject with an aggregated error containing all the errors from the rejected promises. */
      stopOnError: false,
    });

    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      payload: createLoadedResourceState(updatedTrustedApps),
    });

    store.dispatch({ type: 'policyDetailsTrustedAppsForceListDataRefresh' });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
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
