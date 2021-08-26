/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { isEmpty } from 'lodash/fp';
import { ExceptionListClient } from '../../../../../lists/server';

import {
  DeleteTrustedAppsRequestParams,
  GetOneTrustedAppResponse,
  GetTrustedAppsListRequest,
  GetTrustedAppsSummaryResponse,
  GetTrustedListAppsResponse,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
  PutTrustedAppUpdateRequest,
  PutTrustedAppUpdateResponse,
} from '../../../../common/endpoint/types';

import {
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
  osFromExceptionItem,
  updatedTrustedAppToUpdateExceptionListItemOptions,
} from './mapping';
import {
  TrustedAppNotFoundError,
  TrustedAppVersionConflictError,
  TrustedAppPolicyNotExistsError,
} from './errors';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { PackagePolicy } from '../../../../../fleet/common';

const getNonExistingPoliciesFromTrustedApp = async (
  savedObjectClient: SavedObjectsClientContract,
  packagePolicyClient: PackagePolicyServiceInterface,
  trustedApp: PutTrustedAppUpdateRequest | PostTrustedAppCreateRequest
): Promise<PackagePolicy[]> => {
  if (
    !trustedApp.effectScope ||
    trustedApp.effectScope.type === 'global' ||
    (trustedApp.effectScope.type === 'policy' && isEmpty(trustedApp.effectScope.policies))
  ) {
    return [];
  }

  const policies = await packagePolicyClient.getByIDs(
    savedObjectClient,
    trustedApp.effectScope.policies
  );

  if (!policies) {
    return [];
  }

  return policies.filter((policy) => policy.version === undefined);
};

export const deleteTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  { id }: DeleteTrustedAppsRequestParams
) => {
  const exceptionListItem = await exceptionsListClient.deleteExceptionListItem({
    id,
    itemId: undefined,
    namespaceType: 'agnostic',
  });

  if (!exceptionListItem) {
    throw new TrustedAppNotFoundError(id);
  }
};

export const getTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  id: string
): Promise<GetOneTrustedAppResponse> => {
  const trustedAppExceptionItem = await exceptionsListClient.getExceptionListItem({
    itemId: '',
    id,
    namespaceType: 'agnostic',
  });

  if (!trustedAppExceptionItem) {
    throw new TrustedAppNotFoundError(id);
  }

  return {
    data: exceptionListItemToTrustedApp(trustedAppExceptionItem),
  };
};

export const getTrustedAppsList = async (
  exceptionsListClient: ExceptionListClient,
  { page, per_page: perPage, kuery }: GetTrustedAppsListRequest
): Promise<GetTrustedListAppsResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const results = await exceptionsListClient.findExceptionListItem({
    listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
    page,
    perPage,
    filter: kuery,
    namespaceType: 'agnostic',
    sortField: 'name',
    sortOrder: 'asc',
  });

  return {
    data: results?.data.map(exceptionListItemToTrustedApp) ?? [],
    total: results?.total ?? 0,
    page: results?.page ?? 1,
    per_page: results?.per_page ?? perPage!,
  };
};

export const createTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  savedObjectClient: SavedObjectsClientContract,
  packagePolicyClient: PackagePolicyServiceInterface,
  newTrustedApp: PostTrustedAppCreateRequest
): Promise<PostTrustedAppCreateResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const unexistingPolicies = await getNonExistingPoliciesFromTrustedApp(
    savedObjectClient,
    packagePolicyClient,
    newTrustedApp
  );

  if (!isEmpty(unexistingPolicies)) {
    throw new TrustedAppPolicyNotExistsError(
      newTrustedApp.name,
      unexistingPolicies.map((policy) => policy.id)
    );
  }

  const createdTrustedAppExceptionItem = await exceptionsListClient.createExceptionListItem(
    newTrustedAppToCreateExceptionListItemOptions(newTrustedApp)
  );

  return { data: exceptionListItemToTrustedApp(createdTrustedAppExceptionItem) };
};

export const updateTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  savedObjectClient: SavedObjectsClientContract,
  packagePolicyClient: PackagePolicyServiceInterface,
  id: string,
  updatedTrustedApp: PutTrustedAppUpdateRequest
): Promise<PutTrustedAppUpdateResponse> => {
  const currentTrustedApp = await exceptionsListClient.getExceptionListItem({
    itemId: '',
    id,
    namespaceType: 'agnostic',
  });

  if (!currentTrustedApp) {
    throw new TrustedAppNotFoundError(id);
  }

  const unexistingPolicies = await getNonExistingPoliciesFromTrustedApp(
    savedObjectClient,
    packagePolicyClient,
    updatedTrustedApp
  );

  if (!isEmpty(unexistingPolicies)) {
    throw new TrustedAppPolicyNotExistsError(
      updatedTrustedApp.name,
      unexistingPolicies.map((policy) => policy.id)
    );
  }

  let updatedTrustedAppExceptionItem: ExceptionListItemSchema | null;

  try {
    updatedTrustedAppExceptionItem = await exceptionsListClient.updateExceptionListItem(
      updatedTrustedAppToUpdateExceptionListItemOptions(currentTrustedApp, updatedTrustedApp)
    );
  } catch (e) {
    if (e?.output?.statusCode === 409) {
      throw new TrustedAppVersionConflictError(id, e);
    }

    throw e;
  }

  // If `null` is returned, then that means the TA does not exist (could happen in race conditions)
  if (!updatedTrustedAppExceptionItem) {
    throw new TrustedAppNotFoundError(id);
  }

  return {
    data: exceptionListItemToTrustedApp(updatedTrustedAppExceptionItem),
  };
};

export const getTrustedAppsSummary = async (
  exceptionsListClient: ExceptionListClient
): Promise<GetTrustedAppsSummaryResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const summary = {
    linux: 0,
    windows: 0,
    macos: 0,
    total: 0,
  };
  const perPage = 100;
  let paging = true;
  let page = 1;

  while (paging) {
    const { data, total } = (await exceptionsListClient.findExceptionListItem({
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      page,
      perPage,
      filter: undefined,
      namespaceType: 'agnostic',
      sortField: undefined,
      sortOrder: undefined,
    }))!;

    summary.total = total;

    for (const item of data) {
      summary[osFromExceptionItem(item)]++;
    }

    paging = (page - 1) * perPage + data.length < total;
    page++;
  }

  return summary;
};
