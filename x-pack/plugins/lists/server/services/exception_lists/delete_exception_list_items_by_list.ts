/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FoundExceptionListItemSchema,
  ListId,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import { asyncForEach } from '@kbn/std';
import type { SavedObjectsClientContract } from 'kibana/server';

import { findExceptionListItemPointInTimeFinder } from './find_exception_list_item_point_in_time_finder';

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
  // Stream the results from the Point In Time (PIT) finder into this array
  let ids: string[] = [];
  const executeFunctionOnStream = (response: FoundExceptionListItemSchema): void => {
    const responseIds = response.data.map((exceptionListItem) => exceptionListItem.id);
    ids = [...ids, ...responseIds];
  };

  await findExceptionListItemPointInTimeFinder({
    executeFunctionOnStream,
    filter: undefined,
    listId,
    maxSize: undefined, // NOTE: This is unbounded when it is "undefined"
    namespaceType,
    perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
    savedObjectsClient,
    sortField: 'tie_breaker_id',
    sortOrder: 'desc',
  });
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
  await asyncForEach(ids, async (id) => {
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
