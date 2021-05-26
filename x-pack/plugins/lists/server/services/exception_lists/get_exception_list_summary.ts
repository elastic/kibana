/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FoundExceptionListItemSchema,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server/';
import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { GetExceptionListSummaryResponse } from './exception_list_client_types';
import { findExceptionListsItem } from './find_exception_list_items';

interface GetExceptionListSummaryOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export const getExceptionListSummary = async ({
  id,
  listId,
  savedObjectsClient,
  namespaceType,
}: GetExceptionListSummaryOptions): Promise<GetExceptionListSummaryResponse | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  let finalListId: string[] = listId ? [listId] : [];
  if (listId === null && id != null) {
    try {
      const savedObject = await savedObjectsClient.get<ExceptionListSoSchema>(savedObjectType, id);
      finalListId = [savedObject.attributes.list_id];
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return null;
      } else {
        throw err;
      }
    }
  } else if (listId != null) {
    const savedObject = await savedObjectsClient.find<ExceptionListSoSchema>({
      filter: `${savedObjectType}.attributes.list_type: list`,
      perPage: 1,
      search: listId,
      searchFields: ['list_id'],
      sortField: 'tie_breaker_id',
      sortOrder: 'desc',
      type: savedObjectType,
    });
    if (savedObject.saved_objects[0] == null) {
      return null;
    }
  } else {
    return null;
  }

  const summary = {
    linux: 0,
    macos: 0,
    total: 0,
    windows: 0,
  };
  const perPage = 100;
  let paging = true;
  let page = 1;

  while (paging) {
    const items: FoundExceptionListItemSchema | null = await findExceptionListsItem({
      filter: [],
      listId: finalListId,
      namespaceType: ['agnostic'],
      page,
      perPage,
      savedObjectsClient,
      sortField: undefined,
      sortOrder: undefined,
    });

    if (!items) break;

    summary.total = items.total;

    for (const item of items.data) {
      summary[item.os_types[0]]++;
    }

    paging = (page - 1) * perPage + items.data.length < items.total;
    page++;
  }

  return summary;
};
