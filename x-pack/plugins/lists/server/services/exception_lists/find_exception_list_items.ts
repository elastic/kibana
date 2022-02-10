/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import type {
  FoundExceptionListItemSchema,
  Id,
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
import {
  SavedObjectType,
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
  getSavedObjectTypes,
} from '@kbn/securitysolution-list-utils';

import { escapeQuotes } from '../utils/escape_query';
import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectsToFoundExceptionListItem } from './utils';
import { getExceptionList } from './get_exception_list';

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
  const savedObjectType = getSavedObjectTypes({ namespaceType });
  const exceptionLists = (
    await Promise.all(
      listId.map((singleListId, index) => {
        return getExceptionList({
          id: undefined,
          listId: singleListId,
          namespaceType: namespaceType[index],
          savedObjectsClient,
        });
      })
    )
  ).filter((list) => list != null);
  if (exceptionLists.length === 0) {
    return null;
  } else {
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
  }
};

export const getExceptionListsItemFilter = ({
  filter,
  listId,
  savedObjectType,
}: {
  listId: NonEmptyStringArrayDecoded;
  filter: EmptyStringArrayDecoded;
  savedObjectType: SavedObjectType[];
}): string => {
  return listId.reduce((accum, singleListId, index) => {
    const escapedListId = escapeQuotes(singleListId);
    const listItemAppend = `(${savedObjectType[index]}.attributes.list_type: item AND ${savedObjectType[index]}.attributes.list_id: "${escapedListId}")`;
    const listItemAppendWithFilter =
      filter[index] != null ? `(${listItemAppend} AND ${filter[index]})` : listItemAppend;
    if (accum === '') {
      return listItemAppendWithFilter;
    } else {
      return `${accum} OR ${listItemAppendWithFilter}`;
    }
  }, '');
};

interface FindValueListExceptionListsItems {
  valueListId: Id;
  savedObjectsClient: SavedObjectsClientContract;
  perPage: PerPageOrUndefined;
  pit: PitOrUndefined;
  page: PageOrUndefined;
  searchAfter: SearchAfterOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export const findValueListExceptionListItems = async ({
  valueListId,
  savedObjectsClient,
  page,
  pit,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
}: FindValueListExceptionListsItems): Promise<FoundExceptionListItemSchema | null> => {
  const escapedValueListId = escapeQuotes(valueListId);
  const savedObjectsFindResponse = await savedObjectsClient.find<ExceptionListSoSchema>({
    filter: `(exception-list.attributes.list_type: item AND exception-list.attributes.entries.list.id:"${escapedValueListId}") OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.entries.list.id:"${escapedValueListId}") `,
    page,
    perPage,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    type: [exceptionListSavedObjectType, exceptionListAgnosticSavedObjectType],
  });
  return transformSavedObjectsToFoundExceptionListItem({
    savedObjectsFindResponse,
  });
};
