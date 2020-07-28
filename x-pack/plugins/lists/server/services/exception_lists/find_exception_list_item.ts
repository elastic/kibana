/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  FilterOrUndefined,
  FoundExceptionListItemSchema,
  ListId,
  NamespaceType,
  PageOrUndefined,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';

import { findExceptionListsItem } from './find_exception_list_items';

interface FindExceptionListItemOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export const findExceptionListItem = async ({
  listId,
  namespaceType,
  savedObjectsClient,
  filter,
  page,
  perPage,
  sortField,
  sortOrder,
}: FindExceptionListItemOptions): Promise<FoundExceptionListItemSchema | null> => {
  return findExceptionListsItem({
    filter: filter != null ? [filter] : [],
    listId: [listId],
    namespaceType: [namespaceType],
    page,
    perPage,
    savedObjectsClient,
    sortField,
    sortOrder,
  });
};
