/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  FoundExceptionListItemSchema,
  NamespaceTypeArray,
  PageOrUndefined,
  PerPageOrUndefined,
  PitOrUndefined,
  SearchAfterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  EmptyStringArrayDecoded,
  NonEmptyStringArrayDecoded,
} from '@kbn/securitysolution-io-ts-types';
import { getSavedObjectTypes } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectsToFoundExceptionListItem } from './utils';
import { getExceptionListsItemFilter } from './utils/get_exception_lists_item_filter';

interface FindExceptionListItemsOptions {
  listId: NonEmptyStringArrayDecoded;
  namespaceType: NamespaceTypeArray;
  savedObjectsClient: SavedObjectsClientContract;
  filter: EmptyStringArrayDecoded;
  perPage: PerPageOrUndefined;
  pit: PitOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  searchAfter: SearchAfterOrUndefined;
}

export const findExceptionListsItem = async ({
  listId,
  namespaceType,
  savedObjectsClient,
  filter,
  page,
  pit,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
}: FindExceptionListItemsOptions): Promise<FoundExceptionListItemSchema | null> => {
  console.log('IN THE HELPER', namespaceType)

  const savedObjectType = getSavedObjectTypes({ namespaceType });
  console.log({FILTER: getExceptionListsItemFilter({ filter, listId, savedObjectType })})
  const savedObjectsFindResponse = await savedObjectsClient.find<ExceptionListSoSchema>({
    filter: getExceptionListsItemFilter({ filter, listId, savedObjectType }),
    page,
    perPage,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    type: savedObjectType,
  });
  return transformSavedObjectsToFoundExceptionListItem({
    savedObjectsFindResponse,
  });
};
