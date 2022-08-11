/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ImportExceptionListItemSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectsClientContract } from '@kbn/core/server';

import { ImportDataResponse, ImportResponse } from '../../import_exception_list_and_items';

import { getAllListItemTypes } from './find_all_exception_list_item_types';
import { getAllListTypes } from './find_all_exception_list_types';
import { sortExceptionItemsToUpdateOrCreate } from './sort_exception_items_to_create_update';
import { bulkCreateImportedItems } from './bulk_create_imported_items';
import { bulkUpdateImportedItems } from './bulk_update_imported_items';
import { sortItemsImportsByNamespace } from './sort_import_by_namespace';
import { sortImportResponses } from './sort_import_responses';

/**
 * Helper with logic determining when to create or update on exception list items import
 * @param savedObjectsClient
 * @param itemsChunks - exception list items being imported
 * @param isOverwrite - if matching item_id found, should item be overwritten
 * @param user - username
 * @returns {Object} returns counts of successful imports and any errors found
 */
export const importExceptionListItems = async ({
  itemsChunks,
  isOverwrite,
  savedObjectsClient,
  user,
}: {
  itemsChunks: ImportExceptionListItemSchemaDecoded[][];
  isOverwrite: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}): Promise<ImportDataResponse> => {
  let importExceptionListItemsResponse: ImportResponse[] = [];

  for await (const itemsChunk of itemsChunks) {
    // sort by namespaceType
    const [agnosticListItems, nonAgnosticListItems] = sortItemsImportsByNamespace(itemsChunk);
    const mapList = (
      list: ImportExceptionListItemSchemaDecoded
    ): { listId: string; namespaceType: NamespaceType } => ({
      listId: list.list_id,
      namespaceType: list.namespace_type,
    });

    // Gather lists referenced by items
    // Dictionary of found lists
    const foundLists = await getAllListTypes(
      agnosticListItems.map(mapList),
      nonAgnosticListItems.map(mapList),
      savedObjectsClient
    );

    // Find any existing items with matching item_id
    // Dictionary of found items
    const foundItems = await getAllListItemTypes(
      agnosticListItems,
      nonAgnosticListItems,
      savedObjectsClient
    );

    // Figure out which items need to be bulk created/updated
    const { errors, itemsToCreate, itemsToUpdate } = sortExceptionItemsToUpdateOrCreate({
      existingItems: foundItems,
      existingLists: foundLists,
      isOverwrite,
      items: itemsChunk,
      user,
    });

    // Items to bulk create
    const bulkCreateResponse = await bulkCreateImportedItems({
      itemsToCreate,
      savedObjectsClient,
    });

    // Items to bulk update
    const bulkUpdateResponse = await bulkUpdateImportedItems({
      itemsToUpdate,
      savedObjectsClient,
    });

    importExceptionListItemsResponse = [
      ...importExceptionListItemsResponse,
      ...bulkCreateResponse,
      ...bulkUpdateResponse,
      ...errors,
    ];
  }

  return sortImportResponses(importExceptionListItemsResponse);
};
