/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  ExceptionListItemSchema,
  IdOrUndefined,
  ItemIdOrUndefined,
  NamespaceType,
} from '../../../common/schemas';

import { getSavedObjectType } from './utils';
import { getExceptionListItem } from './get_exception_list_item';

interface DeleteExceptionListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteExceptionListItem = async ({
  itemId,
  id,
  namespaceType,
  savedObjectsClient,
}: DeleteExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionListItem = await getExceptionListItem({
    id,
    itemId,
    namespaceType,
    savedObjectsClient,
  });
  if (exceptionListItem == null) {
    return null;
  } else {
    await savedObjectsClient.delete(savedObjectType, exceptionListItem.id);
    return exceptionListItem;
  }
};
