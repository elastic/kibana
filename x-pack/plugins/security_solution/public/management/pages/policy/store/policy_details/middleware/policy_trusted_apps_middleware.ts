/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyDetailsState, MiddlewareRunner } from '../../../types';
import {
  policyIdFromParams,
  isOnPolicyTrustedAppsPage,
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
} from '../selectors';
import {
  ImmutableArray,
  PostTrustedAppCreateRequest,
} from '../../../../../../../common/endpoint/types';
import { ImmutableMiddlewareAPI } from '../../../../../../common/store';
import { TrustedAppsHttpService, TrustedAppsService } from '../../../../trusted_apps/service';
import {
  createLoadedResourceState,
  createLoadingResourceState,
  createUninitialisedResourceState,
  createFailedResourceState,
} from '../../../../../state';
import { parseQueryFilterToKQL } from '../../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../../trusted_apps/constants';
import { PolicyDetailsAction } from '../action';

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
  } else if (
    action.type === 'policyArtifactsUpdateTrustedApps' &&
    isOnPolicyTrustedAppsPage(state) &&
    getCurrentArtifactsLocation(state).show === 'list'
  ) {
    await updateTrustedApps(store, trustedAppsService, action.payload.trustedAppIds);
  }
};
