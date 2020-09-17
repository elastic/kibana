/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server/';
import {
  ExceptionListSchema,
  ExceptionListSoSchema,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectToExceptionList } from './utils';

interface GetExceptionListOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export const getExceptionList = async ({
  id,
  listId,
  savedObjectsClient,
  namespaceType,
}: GetExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  if (id != null) {
    try {
      const savedObject = await savedObjectsClient.get<ExceptionListSoSchema>(savedObjectType, id);
      return transformSavedObjectToExceptionList({ savedObject });
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
    if (savedObject.saved_objects[0] != null) {
      return transformSavedObjectToExceptionList({
        savedObject: savedObject.saved_objects[0],
      });
    } else {
      return null;
    }
  } else {
    return null;
  }
};
