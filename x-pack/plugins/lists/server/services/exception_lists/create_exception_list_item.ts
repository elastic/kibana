/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';

import {
  CommentOrUndefined,
  Description,
  EntriesArray,
  ExceptionListItemSchema,
  ExceptionListSoSchema,
  ExceptionListType,
  ItemId,
  ListId,
  MetaOrUndefined,
  Name,
  NamespaceType,
  Tags,
  _Tags,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectToExceptionListItem } from './utils';

interface CreateExceptionListItemOptions {
  _tags: _Tags;
  comment: CommentOrUndefined;
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
  type: ExceptionListType;
}

export const createExceptionListItem = async ({
  _tags,
  comment,
  entries,
  itemId,
  listId,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  meta,
  user,
  tags,
  tieBreaker,
  type,
}: CreateExceptionListItemOptions): Promise<ExceptionListItemSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const dateNow = new Date().toISOString();
  const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(savedObjectType, {
    _tags,
    comment,
    created_at: dateNow,
    created_by: user,
    description,
    entries,
    item_id: itemId,
    list_id: listId,
    list_type: 'item',
    meta,
    name,
    tags,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_by: user,
  });
  return transformSavedObjectToExceptionListItem({ namespaceType, savedObject });
};
