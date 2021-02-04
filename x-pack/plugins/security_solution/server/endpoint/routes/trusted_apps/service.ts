/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListClient } from '../../../../../lists/server';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  GetTrustedAppsSummaryResponse,
  GetTrustedListAppsResponse,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
} from '../../../../common/endpoint/types';

import {
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
  osFromExceptionItem,
} from './mapping';

export class MissingTrustedAppException {
  constructor(public id: string) {}
}

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
    throw new MissingTrustedAppException(id);
  }
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
    sortField: 'name.keyword',
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
  newTrustedApp: PostTrustedAppCreateRequest
): Promise<PostTrustedAppCreateResponse> => {
  // Ensure list is created if it does not exist
  await exceptionsListClient.createTrustedAppsList();

  const createdTrustedAppExceptionItem = await exceptionsListClient.createExceptionListItem(
    newTrustedAppToCreateExceptionListItemOptions(newTrustedApp)
  );

  return { data: exceptionListItemToTrustedApp(createdTrustedAppExceptionItem) };
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
