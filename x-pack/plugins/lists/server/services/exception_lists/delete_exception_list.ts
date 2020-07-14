/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  ExceptionListSchema,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '../../../common/schemas';

import { getSavedObjectType } from './utils';
import { getExceptionList } from './get_exception_list';
import { deleteExceptionListItemByList } from './delete_exception_list_items_by_list';

interface DeleteExceptionListOptions {
  listId: ListIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteExceptionList = async ({
  listId,
  id,
  namespaceType,
  savedObjectsClient,
}: DeleteExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionList = await getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  if (exceptionList == null) {
    return null;
  } else {
    await deleteExceptionListItemByList({
      listId: exceptionList.list_id,
      namespaceType,
      savedObjectsClient,
    });
    await savedObjectsClient.delete(savedObjectType, exceptionList.id);
    return exceptionList;
  }
};
