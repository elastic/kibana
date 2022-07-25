/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { SavedObjectsBulkCreateObject, SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import {
  BulkErrorSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  ImportExceptionListItemSchemaDecoded,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects';
import { transformCreateCommentsToComments, transformUpdateCommentsToComments } from '..';

export const sortExceptionItemsToUpdateOrCreate = ({
  items,
  existingLists,
  existingItems,
  isOverwrite,
  user,
}: {
  items: ImportExceptionListItemSchemaDecoded[];
  existingLists: Record<string, ExceptionListSchema>;
  existingItems: Record<string, ExceptionListItemSchema>;
  isOverwrite: boolean;
  user: string;
}): {
  errors: BulkErrorSchema[];
  itemsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
  itemsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
} => {
  const results: {
    errors: BulkErrorSchema[];
    itemsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
    itemsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
  } = {
    errors: [],
    itemsToCreate: [],
    itemsToUpdate: [],
  };

  for (const chunk of items) {
    const {
      comments,
      description,
      entries,
      item_id: itemId,
      meta,
      list_id: listId,
      name,
      namespace_type: namespaceType,
      os_types: osTypes,
      tags,
      type,
    } = chunk;
    const dateNow = new Date().toISOString();
    const savedObjectType = getSavedObjectType({ namespaceType });

    if (existingLists[listId] == null) {
      results.errors = [
        ...results.errors,
        {
          error: {
            message: `Exception list with list_id: "${listId}", not found for exception list item with item_id: "${itemId}"`,
            status_code: 409,
          },
          item_id: itemId,
          list_id: listId,
        },
      ];
    } else if (existingItems[itemId] == null) {
      const transformedComments = transformCreateCommentsToComments({
        incomingComments: comments,
        user,
      });

      results.itemsToCreate = [
        ...results.itemsToCreate,
        {
          attributes: {
            comments: transformedComments,
            created_at: dateNow,
            created_by: user,
            description,
            entries,
            immutable: undefined,
            item_id: itemId,
            list_id: listId,
            list_type: 'item',
            meta,
            name,
            os_types: osTypes,
            tags,
            tie_breaker_id: uuid.v4(),
            type,
            updated_by: user,
            version: undefined,
          },
          type: savedObjectType,
        },
      ];
    } else if (existingItems[itemId] != null && isOverwrite) {
      if (existingItems[itemId].list_id === listId) {
        const transformedComments = transformUpdateCommentsToComments({
          comments,
          existingComments: existingItems[itemId].comments,
          user,
        });

        results.itemsToUpdate = [
          ...results.itemsToUpdate,
          {
            attributes: {
              comments: transformedComments,
              description,
              entries,
              meta,
              name,
              os_types: osTypes,
              tags,
              type,
              updated_by: user,
            },
            id: existingItems[itemId].id,
            type: savedObjectType,
          },
        ];
      } else {
        // If overwrite is true, the list parent container is deleted first along
        // with its items, so to get here would mean the user hit a bit of an odd scenario.
        // Sample scenario would be as follows:
        // In system we have:
        // List A ---> with item list_item_id
        // Import is:
        // List A ---> with item list_item_id_1
        // List B ---> with item list_item_id_1
        // If we just did an update of the item, we would overwrite
        // list_item_id_1 of List A, which would be weird behavior
        // What happens:
        // List A and items are deleted and recreated
        // List B is created, but list_item_id_1 already exists under List A and user warned
        results.errors = [
          ...results.errors,
          {
            error: {
              message: `Error trying to update item_id: "${itemId}" and list_id: "${listId}". The item already exists under list_id: ${existingItems[itemId].list_id}`,
              status_code: 409,
            },
            item_id: itemId,
            list_id: listId,
          },
        ];
      }
    } else if (existingItems[itemId] != null) {
      results.errors = [
        ...results.errors,
        {
          error: {
            message: `Found that item_id: "${itemId}" already exists. Import of item_id: "${itemId}" skipped.`,
            status_code: 409,
          },
          item_id: itemId,
          list_id: listId,
        },
      ];
    }
  }
  return results;
};
