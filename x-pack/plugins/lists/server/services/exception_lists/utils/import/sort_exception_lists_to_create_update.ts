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
  ExceptionListSchema,
  ImportExceptionListSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects';

export const sortExceptionListsToUpdateOrCreate = ({
  lists,
  existingLists,
  isOverwrite,
  generateNewListId,
  user,
}: {
  lists: ImportExceptionListSchemaDecoded[];
  existingLists: Record<string, ExceptionListSchema>;
  isOverwrite: boolean;
  generateNewListId: boolean;
  user: string;
}): {
  errors: BulkErrorSchema[];
  listItemsToDelete: Array<[string, NamespaceType]>;
  listsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
  listsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
} => {
  const results: {
    errors: BulkErrorSchema[];
    listItemsToDelete: Array<[string, NamespaceType]>;
    listsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
    listsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
  } = {
    errors: [],
    listItemsToDelete: [],
    listsToCreate: [],
    listsToUpdate: [],
  };

  for (const chunk of lists) {
    const {
      description,
      meta,
      list_id: listId,
      name,
      namespace_type: namespaceType,
      tags,
      type,
      version,
    } = chunk;
    const dateNow = new Date().toISOString();
    const savedObjectType = getSavedObjectType({ namespaceType });

    if (existingLists[listId] == null) {
      results.listsToCreate = [
        ...results.listsToCreate,
        {
          attributes: {
            comments: undefined,
            created_at: dateNow,
            created_by: user,
            description,
            entries: undefined,
            immutable: false,
            item_id: undefined,
            list_id: listId,
            list_type: 'list',
            meta,
            name,
            os_types: [],
            tags,
            tie_breaker_id: uuidv4(),
            type,
            updated_by: user,
            version,
          },
          type: savedObjectType,
        },
      ];
    } else if (existingLists[listId] != null && isOverwrite) {
      results.listItemsToDelete = [...results.listItemsToDelete, [listId, namespaceType]];
      results.listsToUpdate = [
        ...results.listsToUpdate,
        {
          attributes: {
            description,
            meta,
            name,
            tags,
            type,
            updated_by: user,
          },
          id: existingLists[listId].id,
          type: savedObjectType,
        },
      ];
    } else if (existingLists[listId] != null && generateNewListId) {
      const attributes: ExceptionListSoSchema = {
        ...existingLists[listId],
        comments: undefined,
        created_at: dateNow,
        created_by: user,
        description,
        entries: undefined,
        immutable: false,
        item_id: undefined,
        list_type: 'list',
        tie_breaker_id: uuidv4(),
        updated_by: user,
      };
      results.listsToCreate = [
        ...results.listsToCreate,
        {
          attributes,
          type: savedObjectType,
        },
      ];
    } else if (existingLists[listId] != null) {
      results.errors = [
        ...results.errors,
        {
          error: {
            message: `Found that list_id: "${listId}" already exists. Import of list_id: "${listId}" skipped.`,
            status_code: 409,
          },
          list_id: listId,
        },
      ];
    }
  }
  return results;
};
