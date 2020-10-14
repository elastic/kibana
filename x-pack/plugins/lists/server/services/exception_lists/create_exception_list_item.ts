/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';

import {
  CreateCommentsArray,
  Description,
  EntriesArray,
  ExceptionListItemSchema,
  ExceptionListItemType,
  ExceptionListSoSchema,
  ItemId,
  ListId,
  MetaOrUndefined,
  Name,
  NamespaceType,
  OsTypeArray,
  Tags,
} from '../../../common/schemas';

import {
  getSavedObjectType,
  transformCreateCommentsToComments,
  transformSavedObjectToExceptionListItem,
} from './utils';

interface CreateExceptionListItemOptions {
  comments: CreateCommentsArray;
  listId: ListId;
  itemId: ItemId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  entries: EntriesArray;
  meta: MetaOrUndefined;
  user: string;
  tags: Tags;
  tieBreaker?: string;
  type: ExceptionListItemType;
  osTypes: OsTypeArray;
}

export const createExceptionListItem = async ({
  comments,
  entries,
  itemId,
  listId,
  savedObjectsClient,
  namespaceType,
  name,
  osTypes,
  description,
  meta,
  user,
  tags,
  tieBreaker,
  type,
}: CreateExceptionListItemOptions): Promise<ExceptionListItemSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const dateNow = new Date().toISOString();
  const transformedComments = transformCreateCommentsToComments({
    incomingComments: comments,
    user,
  });
  const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(savedObjectType, {
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
    os_types: osTypes as OsTypeArray,
    tags,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_by: user,
    version: undefined,
  });
  return transformSavedObjectToExceptionListItem({ savedObject });
};
