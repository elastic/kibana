/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  IdOrUndefined,
  ItemIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server';
import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectToExceptionListItem } from './utils';

interface GetExceptionListItemOptions {
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export const getExceptionListItem = async ({
  id,
  itemId,
  savedObjectsClient,
  namespaceType,
}: GetExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  if (id != null) {
    try {
      const savedObject = await savedObjectsClient.get<ExceptionListSoSchema>(savedObjectType, id);
      return transformSavedObjectToExceptionListItem({ savedObject });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return null;
      } else {
        throw err;
      }
    }
  } else if (itemId != null) {
    const savedObject = await savedObjectsClient.find<ExceptionListSoSchema>({
      filter: `${savedObjectType}.attributes.list_type: item`,
      perPage: 1,
      search: itemId,
      searchFields: ['item_id'],
      sortField: 'tie_breaker_id',
      sortOrder: 'desc',
      type: savedObjectType,
    });
    if (savedObject.saved_objects[0] != null) {
      return transformSavedObjectToExceptionListItem({
        savedObject: savedObject.saved_objects[0],
      });
    } else {
      return null;
    }
  } else {
    return null;
  }
};
