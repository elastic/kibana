/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListClient } from '../../../../../lists/server';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  GetTrustedListAppsResponse,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
} from '../../../../common/endpoint/types';

import { exceptionItemToTrustedAppItem, newTrustedAppItemToExceptionItem } from './mapping';

export const deleteTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  { id }: DeleteTrustedAppsRequestParams
) => {
  await exceptionsListClient.deleteExceptionListItem({
    id,
    itemId: undefined,
    namespaceType: 'agnostic',
  });
};

export const getTrustedAppsList = async (
  exceptionsListClient: ExceptionListClient,
  { page, per_page: perPage }: GetTrustedAppsListRequest
): Promise<GetTrustedListAppsResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const results = await exceptionsListClient.findExceptionListItem({
    listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
    page,
    perPage,
    filter: undefined,
    namespaceType: 'agnostic',
    sortField: 'name',
    sortOrder: 'asc',
  });

  return {
    data: results?.data.map(exceptionItemToTrustedAppItem) ?? [],
    total: results?.total ?? 0,
    page: results?.page ?? 1,
    per_page: results?.per_page ?? perPage!,
  };
};

export const createTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
  newTrustedApp: PostTrustedAppCreateRequest
): Promise<PostTrustedAppCreateResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const createdTrustedAppExceptionItem = await exceptionsListClient.createExceptionListItem(
    newTrustedAppItemToExceptionItem(newTrustedApp)
  );

  return { data: exceptionItemToTrustedAppItem(createdTrustedAppExceptionItem) };
};
