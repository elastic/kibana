/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import type {
  FilterOrUndefined,
  FoundExceptionListItemSchema,
  ListId,
  MaxSizeOrUndefined,
  NamespaceType,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';

import { findExceptionListsItemPointInTimeFinder } from './find_exception_list_items_point_in_time_finder';

interface FindExceptionListItemPointInTimeFinderOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListItemSchema) => void;
  maxSize: MaxSizeOrUndefined;
}

export const findExceptionListItemPointInTimeFinder = async ({
  executeFunctionOnStream,
  listId,
  namespaceType,
  savedObjectsClient,
  filter,
  maxSize,
  perPage,
  sortField,
  sortOrder,
}: FindExceptionListItemPointInTimeFinderOptions): Promise<void> => {
  return findExceptionListsItemPointInTimeFinder({
    executeFunctionOnStream,
    filter: filter != null ? [filter] : [],
    listId: [listId],
    maxSize,
    namespaceType: [namespaceType],
    perPage,
    savedObjectsClient,
    sortField,
    sortOrder,
  });
};
