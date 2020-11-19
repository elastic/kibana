/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  ExceptionListSoSchema,
  FilterOrUndefined,
  FoundExceptionListSchema,
  NamespaceType,
  PageOrUndefined,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';
import { SavedObjectType } from '../../saved_objects';

import { getSavedObjectType, transformSavedObjectsToFoundExceptionList } from './utils';

interface FindExceptionListOptions {
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export const findExceptionList = async ({
  namespaceType,
  savedObjectsClient,
  filter,
  page,
  perPage,
  sortField,
  sortOrder,
}: FindExceptionListOptions): Promise<FoundExceptionListSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const savedObjectsFindResponse = await savedObjectsClient.find<ExceptionListSoSchema>({
    filter: getExceptionListFilter({ filter, savedObjectType }),
    page,
    perPage,
    sortField,
    sortOrder,
    type: savedObjectType,
  });
  return transformSavedObjectsToFoundExceptionList({ savedObjectsFindResponse });
};

export const getExceptionListFilter = ({
  filter,
  savedObjectType,
}: {
  filter: FilterOrUndefined;
  savedObjectType: SavedObjectType;
}): string => {
  if (filter == null) {
    return `${savedObjectType}.attributes.list_type: list`;
  } else {
    return `${savedObjectType}.attributes.list_type: list AND ${filter}`;
  }
};
