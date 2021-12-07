/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { SavedObjectsBulkCreateObject, SavedObjectsBulkUpdateObject } from 'kibana/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import {
  BulkErrorSchema,
  ImportExceptionListSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects';

export const sortExceptionListsToUpdateOrCreate = ({
  lists,
  existingLists,
  isOverwrite,
  user,
}: {
  lists: ImportExceptionListSchemaDecoded[];
  existingLists: Record<string, ImportExceptionListSchemaDecoded>;
  isOverwrite: boolean;
  user: string;
}): {
  errors: BulkErrorSchema[];
  listItemsToDelete: Array<[string, NamespaceType]>;
  listsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
  listsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
} => {
  return lists.reduce<{
    errors: BulkErrorSchema[];
    listItemsToDelete: Array<[string, NamespaceType]>;
    listsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
    listsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
  }>(
    (acc, chunk) => {
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
        return {
          ...acc,
          listsToCreate: [
            ...acc.listsToCreate,
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
                tie_breaker_id: uuid.v4(),
                type,
                updated_by: user,
                version,
              },
              type: savedObjectType,
            },
          ],
        };
      } else if (existingLists[listId] != null && isOverwrite) {
        return {
          ...acc,
          listItemsToDelete: [...acc.listItemsToDelete, [listId, namespaceType]],
          listsToUpdate: [
            ...acc.listsToUpdate,
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
          ],
        };
      } else if (existingLists[listId] != null) {
        return {
          ...acc,
          errors: [
            ...acc.errors,
            {
              error: {
                message: `Found that list_id: "${listId}" already exists. Import of list_id: "${listId}" skipped.`,
                status_code: 409,
              },
              list_id: listId,
            },
          ],
        };
      } else {
        return acc;
      }
    },
    {
      errors: [],
      listItemsToDelete: [],
      listsToCreate: [],
      listsToUpdate: [],
    }
  );
};
