/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { v4 as uuid } from 'uuid';
import {
  CreateExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListTypeEnum,
  FoundExceptionListItemSchema,
  ListId,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

import { findExceptionListsItemPointInTimeFinder } from './find_exception_list_items_point_in_time_finder';
import { bulkCreateExceptionListItems } from './bulk_create_exception_list_items';
import { getExceptionList } from './get_exception_list';
import { createExceptionList } from './create_exception_list';

const LISTS_ABLE_TO_DUPLICATE = [
  ExceptionListTypeEnum.DETECTION.toString(),
  ExceptionListTypeEnum.RULE_DEFAULT.toString(),
];

interface CreateExceptionListOptions {
  listId: ListId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  user: string;
}

export const duplicateExceptionListAndItems = async ({
  listId,
  savedObjectsClient,
  namespaceType,
  user,
}: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
  // Generate a new static listId
  const newListId = uuid();

  // fetch list container
  const listToDuplicate = await getExceptionList({
    id: undefined,
    listId,
    namespaceType,
    savedObjectsClient,
  });

  if (listToDuplicate == null) {
    throw new Error(`Exception list to duplicat of list_id:${listId} not found.`);
  }

  if (!LISTS_ABLE_TO_DUPLICATE.includes(listToDuplicate.type)) {
    throw new Error(`Exception list of type:${listToDuplicate.type} cannot be duplicated.`);
  }

  const newlyCreatedList = await createExceptionList({
    description: listToDuplicate.description,
    immutable: listToDuplicate.immutable,
    listId: newListId,
    meta: listToDuplicate.meta,
    name: listToDuplicate.name,
    namespaceType: listToDuplicate.namespace_type,
    savedObjectsClient,
    tags: listToDuplicate.tags,
    type: listToDuplicate.type,
    user,
    version: 1,
  });

  // fetch associated items
  let itemsToBeDuplicated: CreateExceptionListItemSchema[] = [];
  const executeFunctionOnStream = (response: FoundExceptionListItemSchema): void => {
    const transformedItems = response.data.map((item) => {
      // Generate a new static listId
      const newItemId = uuid();

      return {
        comments: [],
        description: item.description,
        entries: item.entries,
        item_id: newItemId,
        list_id: newlyCreatedList.list_id,
        meta: item.meta,
        name: item.name,
        namespace_type: item.namespace_type,
        os_types: item.os_types,
        tags: item.tags,
        type: item.type,
      };
    });
    itemsToBeDuplicated = [...itemsToBeDuplicated, ...transformedItems];
  };
  await findExceptionListsItemPointInTimeFinder({
    executeFunctionOnStream,
    filter: [],
    listId: [listId],
    maxSize: 10000,
    namespaceType: [namespaceType],
    perPage: undefined,
    savedObjectsClient,
    sortField: undefined,
    sortOrder: undefined,
  });

  await bulkCreateExceptionListItems({
    items: itemsToBeDuplicated,
    savedObjectsClient,
    user,
  });

  return newlyCreatedList;
};
