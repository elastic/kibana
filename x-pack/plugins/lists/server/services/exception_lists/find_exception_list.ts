/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import type {
  FilterOrUndefined,
  FoundExceptionListSchema,
  NamespaceTypeArray,
  PageOrUndefined,
  PerPageOrUndefined,
  PitOrUndefined,
  SearchAfterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectType, getSavedObjectTypes } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectsToFoundExceptionList } from './utils';

interface FindExceptionListOptions {
  namespaceType: NamespaceTypeArray;
  savedObjectsClient: SavedObjectsClientContract;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  pit: PitOrUndefined;
  searchAfter: SearchAfterOrUndefined;
}

export const findExceptionList = async ({
  namespaceType,
  savedObjectsClient,
  filter,
  page,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
  pit,
}: FindExceptionListOptions): Promise<FoundExceptionListSchema> => {
  const savedObjectTypes = getSavedObjectTypes({ namespaceType });
  const savedObjectsFindResponse = await savedObjectsClient.find<ExceptionListSoSchema>({
    filter: getExceptionListFilter({ filter, savedObjectTypes }),
    page,
    perPage,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    type: savedObjectTypes,
  });

  return transformSavedObjectsToFoundExceptionList({ savedObjectsFindResponse });
};

export const getExceptionListFilter = ({
  filter,
  savedObjectTypes,
}: {
  filter: FilterOrUndefined;
  savedObjectTypes: SavedObjectType[];
}): string => {
  const listTypesFilter = savedObjectTypes
    .map((type) => `${type}.attributes.list_type: list`)
    .join(' OR ');

  if (filter != null) {
    return `(${listTypesFilter}) AND ${filter}`;
  } else return `(${listTypesFilter})`;
};
