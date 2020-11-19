/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from '../../../../../../src/core/server/';
import { ListId, NamespaceType } from '../../../common/schemas';

import { findExceptionListItem } from './find_exception_list_item';
import { getSavedObjectType } from './utils';

const PER_PAGE = 100;

interface DeleteExceptionListItemByListOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteExceptionListItemByList = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: DeleteExceptionListItemByListOptions): Promise<void> => {
  const ids = await getExceptionListItemIds({ listId, namespaceType, savedObjectsClient });
  await deleteFoundExceptionListItems({ ids, namespaceType, savedObjectsClient });
};

export const getExceptionListItemIds = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: DeleteExceptionListItemByListOptions): Promise<string[]> => {
  let page = 1;
  let ids: string[] = [];
  let foundExceptionListItems = await findExceptionListItem({
    filter: undefined,
    listId,
    namespaceType,
    page,
    perPage: PER_PAGE,
    savedObjectsClient,
    sortField: 'tie_breaker_id',
    sortOrder: 'desc',
  });
  while (foundExceptionListItems != null && foundExceptionListItems.data.length > 0) {
    ids = [
      ...ids,
      ...foundExceptionListItems.data.map((exceptionListItem) => exceptionListItem.id),
    ];
    page += 1;
    foundExceptionListItems = await findExceptionListItem({
      filter: undefined,
      listId,
      namespaceType,
      page,
      perPage: PER_PAGE,
      savedObjectsClient,
      sortField: 'tie_breaker_id',
      sortOrder: 'desc',
    });
  }
  return ids;
};

/**
 * NOTE: This is slow and terrible as we are deleting everything one at a time.
 * TODO: Replace this with a bulk call or a delete by query would be more useful
 */
export const deleteFoundExceptionListItems = async ({
  ids,
  savedObjectsClient,
  namespaceType,
}: {
  ids: string[];
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}): Promise<void> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  ids.forEach(async (id) => {
    try {
      await savedObjectsClient.delete(savedObjectType, id);
    } catch (err) {
      // This can happen from race conditions or networking issues so deleting the id's
      // like this is considered "best effort" and it is possible to get dangling pieces
      // of data sitting around in which case the user has to manually clean up the data
      // I am very hopeful this does not happen often or at all.
    }
  });
};
