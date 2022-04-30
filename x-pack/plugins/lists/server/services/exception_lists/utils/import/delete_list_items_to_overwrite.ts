/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectsClientContract } from 'kibana/server';

import { deleteExceptionListItemByList } from '../../delete_exception_list_items_by_list';

/**
 * Helper to delete list items of exception lists to be updated
 * as a result of user selecting to overwrite
 * @param listsOfItemsToDelete {array} - information needed to delete exception list items
 * @param savedObjectsClient {object}
 * @returns {array} returns array of success and error formatted responses
 */
export const deleteListItemsToBeOverwritten = async ({
  listsOfItemsToDelete,
  savedObjectsClient,
}: {
  listsOfItemsToDelete: Array<[string, NamespaceType]>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<void> => {
  for await (const list of listsOfItemsToDelete) {
    await deleteExceptionListItemByList({
      listId: list[0],
      namespaceType: list[1],
      savedObjectsClient,
    });
  }
};
