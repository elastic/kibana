/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { difference } from 'lodash';

import { fromKueryExpression, toKueryExpression } from '@kbn/es-query';
import type {
  CreateExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListItemSchema,
} from '../../../../lists/common/schemas';
import {
  createExceptionListItemSchema,
  exceptionListSchema,
} from '../../../../lists/common/schemas';
import type { KibanaListsSOClient } from '../types';
import { transformValidate } from '../../../../lists/common/transform_validate';
import { getList, getListAndListItems } from '../lists';
import { createList } from '../lists/create_list';
import { createListItem } from '../items/create_list_item';
import { getListItemByValues } from '../items/get_list_item_by_values';
import { getListItemsByListIds } from '../items/get_list_items_by_list_ids';
import { deleteListItemByListIds } from '../items/delete_list_item_by_list_ids';

import type {
  ImportExceptionListsResult,
  ImportExceptionLists,
  ImportExceptionListAndItemsWithoutReferences,
  GetListsToImportAndOverwrite,
  ListsToImportAndOverwrite,
} from './types';

const getListsToImportAndOverwrite = async ({
  lists,
  client,
  overwrite,
}: GetListsToImportAndOverwrite): Promise<ListsToImportAndOverwrite> => {
  const listIds = lists.map(({ list_id }) => list_id);
  const existingLists = await getListItemsByListIds({ client, listIds });
  const existingListIds = existingLists.map(({ list_id }) => list_id);

  return lists.reduce<ListsToImportAndOverwrite>(
    (acc, list) => {
      if (existingListIds.includes(list.list_id)) {
        if (overwrite) {
          acc.listsToBeOverwritten.push(list);
        } else {
          acc.errors.push({
            list_id: list.list_id,
            error: {
              message: `Found that list_id: "${list.list_id}" already exists. Import of list_id: "${list.list_id}" skipped.`,
              status_code: 409,
            },
          });
        }
      } else {
        acc.listsToImport.push(list);
      }
      return acc;
    },
    { listsToImport: [], listsToBeOverwritten: [], errors: [] }
  );
};

const importExceptionListAndItemsWithoutReferences = async ({
  lists,
  listItems,
  client,
  user,
  version,
}: ImportExceptionListAndItemsWithoutReferences): Promise<ImportExceptionListsResult> => {
  const listIds = lists.map(({ list_id }) => list_id);
  const listItemsForLists = listItems.filter(({ list_id }) => listIds.includes(list_id));

  const importedLists = await Promise.all(
    lists.map(async (list) => {
      const createdList = await createList({ list, client, user, version });
      const createdListItems = await Promise.all(
        listItemsForLists
          .filter((listItem) => listItem.list_id === list.list_id)
          .map(async (listItem) => createListItem({ listItem, client, user }))
      );
      return { ...createdList, list_items: createdListItems };
    })
  );

  return importedLists.reduce<ImportExceptionListsResult>(
    (acc, list) => {
      if (list.list_items.length > 0) {
        acc.success_count += list.list_items.length;
        acc.success_count_exception_list_items += list.list_items.length;
      }
      acc.success_count += 1;
      acc.success_count_exception_lists += 1;
      return acc;
    },
    {
      success_count: 0,
      success_count_exception_lists: 0,
      success_count_exception_list_items: 0,
      errors: [],
    }
  );
};

const deleteOrphanedListItems = async ({
  lists,
  importedListItems,
  client,
}: {
  lists: ExceptionListSchema[];
  importedListItems: CreateExceptionListItemSchema[];
  client: KibanaListsSOClient;
}): Promise<void> => {
  await Promise.all(
    lists.map(async (list) => {
      const importedItemIds = importedListItems
        .filter((item) => item.list_id === list.list_id && item.item_id != null)
        .map((item) => item.item_id as string);

      return client.deleteByQuery({
        index: client.getIndex(),
        body: {
          query: {
            bool: {
              filter: [
                { term: { list_id: list.list_id } },
                {
                  bool: {
                    must_not: {
                      terms: {
                        item_id: importedItemIds,
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        refresh: 'wait_for',
      });
    })
  );
};

export const importExceptionLists = async ({
  lists,
  listItems,
  client,
  user,
  overwrite,
  version,
}: ImportExceptionLists): Promise<ImportExceptionListsResult> => {
  const { listsToBeOverwritten, listsToImport, errors: listsErrors } = await getListsToImportAndOverwrite(
    {
      lists,
      client,
      overwrite,
    }
  );

  const { importedLists, errors: importListsErrors } = await importExceptionListAndItemsWithoutReferences(
    {
      lists: [...listsToImport, ...listsToBeOverwritten],
      listItems,
      client,
      user,
      version,
    }
  );

  if (overwrite) {
    await deleteOrphanedListItems({
      lists: listsToBeOverwritten,
      importedListItems: listItems,
      client,
    });
  }

  const listIds = lists.map(({ list_id }) => list_id);
  const listItemsWithoutListId = listItems.filter(({ list_id }) => !listIds.includes(list_id));
  const errorsWithoutListId = listItemsWithoutListId.map(({ item_id, list_id }) => ({
    item_id,
    list_id,
    error: {
      message: `Exception list with list_id: "${list_id}", not found for exception list item with item_id: "${item_id}"`,
      status_code: 409,
    },
  }));

  const allErrors = [...listsErrors, ...importListsErrors, ...errorsWithoutListId];

  return {
    ...importedLists,
    errors: allErrors,
  };
};
