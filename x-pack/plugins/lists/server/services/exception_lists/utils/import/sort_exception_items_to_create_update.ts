/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
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
            tie_breaker_id: uuidv4(),
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
