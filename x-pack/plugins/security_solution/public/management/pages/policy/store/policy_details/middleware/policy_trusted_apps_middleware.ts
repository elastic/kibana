/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { find, isEmpty } from 'lodash/fp';
import { PolicyDetailsState, MiddlewareRunner } from '../../../types';
import {
  policyIdFromParams,
  isOnPolicyTrustedAppsPage,
  getCurrentArtifactsLocation,
  getAssignableArtifactsList,
} from '../selectors';
import {
  ImmutableArray,
  ImmutableObject,
  PostTrustedAppCreateRequest,
  TrustedApp,
} from '../../../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI } from '../../../../../../common/store';
import { TrustedAppsHttpService, TrustedAppsService } from '../../../../trusted_apps/service';
import {
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  createFailedResourceState,
  isLoadingResourceState,
} from '../../../../../state';
import { parseQueryFilterToKQL } from '../../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../../trusted_apps/constants';
import { PolicyDetailsAction } from '../action';

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
  if (isLoadingResourceState(state.artifacts.doesAnyTrustedApp)) {
    return;
  }
  store.dispatch({
    type: 'policyArtifactsDeosAnyTrustedApp',
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
      type: 'policyArtifactsDeosAnyTrustedApp',
      payload: createLoadedResourceState(!isEmpty(trustedApps.data)),
    });
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsDeosAnyTrustedApp',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
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
  } catch (err) {
    store.dispatch({
      type: 'policyArtifactsUpdateTrustedAppsChanged',
      // Ignore will be fixed with when AsyncResourceState is refactored (#830)
      // @ts-ignore
      payload: createFailedResourceState(err.body ?? err),
    });
  }
};

export const policyTrustedAppsMiddlewareRunner: MiddlewareRunner = async (
  coreStart,
  store,
  action
) => {
  const http = coreStart.http;
  const trustedAppsService = new TrustedAppsHttpService(http);
  const state = store.getState();
  if (
    action.type === 'userChangedUrl' &&
    isOnPolicyTrustedAppsPage(state) &&
    getCurrentArtifactsLocation(state).show === 'list'
  ) {
    await searchTrustedApps(store, trustedAppsService);
  } else if (action.type === 'userChangedUrl' && isOnPolicyTrustedAppsPage(state)) {
    // TODO: Change this action when list is merged into this branch
    await checkIfAnyTrustedApp(store, trustedAppsService);
  } else if (
    action.type === 'policyArtifactsUpdateTrustedApps' &&
    isOnPolicyTrustedAppsPage(state) &&
    getCurrentArtifactsLocation(state).show === 'list'
  ) {
    await updateTrustedApps(store, trustedAppsService, action.payload.trustedAppIds);
  } else if (
    action.type === 'policyArtifactsAssignableListPageDataFilter' &&
    isOnPolicyTrustedAppsPage(state) &&
    getCurrentArtifactsLocation(state).show === 'list'
  ) {
    await searchTrustedApps(store, trustedAppsService, action.payload.filter);
  }
};
