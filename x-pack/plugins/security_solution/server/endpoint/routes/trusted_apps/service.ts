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
  PutTrustedAppUpdateRequest,
  PutTrustedAppUpdateResponse,
} from '../../../../common/endpoint/types';

import {
  exceptionListItemToTrustedApp,
  newTrustedAppToCreateExceptionListItemOptions,
  osFromExceptionItem,
  updatedTrustedAppToUpdateExceptionListItemOptions,
} from './mapping';
import { ExceptionListItemSchema } from '../../../../../lists/common';
import { TrustedAppNotFoundError, TrustedAppVersionConflictError } from './errors';

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

  // Validate update TA entry - error if not valid
  // TODO: implement validations

  const createdTrustedAppExceptionItem = await exceptionsListClient.createExceptionListItem(
    newTrustedAppToCreateExceptionListItemOptions(newTrustedApp)
  );

  return { data: exceptionListItemToTrustedApp(createdTrustedAppExceptionItem) };
};

export const updateTrustedApp = async (
  exceptionsListClient: ExceptionListClient,
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

  // Validate update TA entry - error if not valid
  // TODO: implement validations

  let updatedTrustedAppExceptionItem: ExceptionListItemSchema | null;

  try {
    updatedTrustedAppExceptionItem = await exceptionsListClient.updateExceptionListItem(
      updatedTrustedAppToUpdateExceptionListItemOptions(currentTrustedApp, updatedTrustedApp)
    );
  } catch (e) {
    if (e?.output.statusCode === 409) {
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
