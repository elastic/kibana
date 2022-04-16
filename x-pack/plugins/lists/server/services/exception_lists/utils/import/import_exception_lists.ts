/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImportExceptionListSchemaDecoded } from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectsClientContract } from '@kbn/core/server';

import { ImportDataResponse, ImportResponse } from '../../import_exception_list_and_items';

import { getAllListTypes } from './find_all_exception_list_types';
import { sortExceptionListsToUpdateOrCreate } from './sort_exception_lists_to_create_update';
import { bulkCreateImportedLists } from './bulk_create_imported_lists';
import { bulkUpdateImportedLists } from './bulk_update_imported_lists';
import { deleteListItemsToBeOverwritten } from './delete_list_items_to_overwrite';
import { sortListsImportsByNamespace } from './sort_import_by_namespace';
import { sortImportResponses } from './sort_import_responses';
/**
 * Helper with logic determining when to create or update on exception list import
 * @param exceptionListsClient - exceptions client
 * @param listsChunks - exception lists being imported
 * @param isOverwrite - if matching lis_id found, should list be overwritten
 * @returns {Object} returns counts of successful imports and any errors found
 */
export const importExceptionLists = async ({
  isOverwrite,
  listsChunks,
  savedObjectsClient,
  user,
}: {
  isOverwrite: boolean;
  listsChunks: ImportExceptionListSchemaDecoded[][];
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}): Promise<ImportDataResponse> => {
  let importExceptionListsResponse: ImportResponse[] = [];

  for await (const listChunk of listsChunks) {
    // sort by namespaceType
    const [agnosticLists, nonAgnosticLists] = sortListsImportsByNamespace(listChunk);

    // Gather lists referenced by items
    // Dictionary of found lists
    const foundLists = await getAllListTypes(
      agnosticLists.map((list) => ({ listId: list.list_id, namespaceType: list.namespace_type })),
      nonAgnosticLists.map((list) => ({
        listId: list.list_id,
        namespaceType: list.namespace_type,
      })),
      savedObjectsClient
    );

    // Figure out what lists to bulk create/update
    const { errors, listItemsToDelete, listsToCreate, listsToUpdate } =
      sortExceptionListsToUpdateOrCreate({
        existingLists: foundLists,
        isOverwrite,
        lists: listChunk,
        user,
      });

    // lists to bulk create/update
    const bulkCreateResponse = await bulkCreateImportedLists({
      listsToCreate,
      savedObjectsClient,
    });
    // lists that are to be updated where overwrite is true, need to have
    // existing items removed. By selecting to overwrite, user selects to
    // overwrite entire list + items
    await deleteListItemsToBeOverwritten({
      listsOfItemsToDelete: listItemsToDelete,
      savedObjectsClient,
    });

    const bulkUpdateResponse = await bulkUpdateImportedLists({
      listsToUpdate,
      savedObjectsClient,
    });

    importExceptionListsResponse = [
      ...importExceptionListsResponse,
      ...bulkCreateResponse,
      ...bulkUpdateResponse,
      ...errors,
    ];
  }

  return sortImportResponses(importExceptionListsResponse);
};
