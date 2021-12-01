/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { isEmpty, isEqual } from 'lodash/fp';
import { ExceptionListClient } from '../../../../../lists/server';

import {
  DeleteTrustedAppsRequestParams,
  GetOneTrustedAppResponse,
  GetTrustedAppsListRequest,
  GetTrustedAppsListResponse,
  GetTrustedAppsSummaryRequest,
  GetTrustedAppsSummaryResponse,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
  PutTrustedAppUpdateRequest,
  PutTrustedAppUpdateResponse,
  TrustedApp,
} from '../../../../common/endpoint/types';

import {
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
  osFromExceptionItem,
  updatedTrustedAppToUpdateExceptionListItemOptions,
} from './mapping';
import {
  TrustedAppNotFoundError,
  TrustedAppPolicyNotExistsError,
  TrustedAppVersionConflictError,
} from './errors';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { PackagePolicy } from '../../../../../fleet/common';
import { EndpointLicenseError } from '../../errors';

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

const isUserTryingToModifyEffectScopeWithoutPermissions = (
  currentTrustedApp: TrustedApp,
  updatedTrustedApp: PutTrustedAppUpdateRequest,
  isAtLeastPlatinum: boolean
): boolean => {
  if (updatedTrustedApp.effectScope.type === 'global') {
    return false;
  } else if (isAtLeastPlatinum) {
    return false;
  } else if (
    isEqual(
      currentTrustedApp.effectScope.type === 'policy' &&
        currentTrustedApp.effectScope.policies.sort(),
      updatedTrustedApp.effectScope.policies.sort()
    )
  ) {
    return false;
  } else {
    return true;
  }
};

/**
 * Attempts to first fine the ExceptionItem using `item_id` and if not found, then a second attempt wil be done
 * against the Saved Object `id`.
 * @param exceptionsListClient
 * @param id
 */
export const findTrustedAppExceptionItemByIdOrItemId = async (
  exceptionsListClient: ExceptionListClient,
  id: string
): Promise<ExceptionListItemSchema | null> => {
  const trustedAppExceptionItem = await exceptionsListClient.getExceptionListItem({
    itemId: id,
    id: undefined,
    namespaceType: 'agnostic',
  });

  if (trustedAppExceptionItem) {
    return trustedAppExceptionItem;
  }

  return exceptionsListClient.getExceptionListItem({
    itemId: undefined,
    id,
    namespaceType: 'agnostic',
  });
};

export const deleteTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  { id }: DeleteTrustedAppsRequestParams
): Promise<void> => {
  const trustedAppExceptionItem = await findTrustedAppExceptionItemByIdOrItemId(
    exceptionsListClient,
    id
  );

  if (!trustedAppExceptionItem) {
    throw new TrustedAppNotFoundError(id);
  }

  await exceptionsListClient.deleteExceptionListItem({
    id: trustedAppExceptionItem.id,
    itemId: undefined,
    namespaceType: 'agnostic',
  });
};

export const getTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  id: string
): Promise<GetOneTrustedAppResponse> => {
  const trustedAppExceptionItem = await findTrustedAppExceptionItemByIdOrItemId(
    exceptionsListClient,
    id
  );

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
): Promise<GetTrustedAppsListResponse> => {
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    per_page: results?.per_page ?? perPage!,
  };
};

export const createTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  savedObjectClient: SavedObjectsClientContract,
  packagePolicyClient: PackagePolicyServiceInterface,
  newTrustedApp: PostTrustedAppCreateRequest,
  isAtLeastPlatinum: boolean
): Promise<PostTrustedAppCreateResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  if (newTrustedApp.effectScope.type === 'policy' && !isAtLeastPlatinum) {
    throw new EndpointLicenseError();
  }

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
  updatedTrustedApp: PutTrustedAppUpdateRequest,
  isAtLeastPlatinum: boolean
): Promise<PutTrustedAppUpdateResponse> => {
  const currentTrustedAppExceptionItem = await findTrustedAppExceptionItemByIdOrItemId(
    exceptionsListClient,
    id
  );

  if (!currentTrustedAppExceptionItem) {
    throw new TrustedAppNotFoundError(id);
  }

  if (
    isUserTryingToModifyEffectScopeWithoutPermissions(
      exceptionListItemToTrustedApp(currentTrustedAppExceptionItem),
      updatedTrustedApp,
      isAtLeastPlatinum
    )
  ) {
    throw new EndpointLicenseError();
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
      updatedTrustedAppToUpdateExceptionListItemOptions(
        currentTrustedAppExceptionItem,
        updatedTrustedApp
      )
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
  exceptionsListClient: ExceptionListClient,
  { kuery }: GetTrustedAppsSummaryRequest
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { data, total } = (await exceptionsListClient.findExceptionListItem({
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      page,
      perPage,
      filter: kuery,
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
