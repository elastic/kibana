/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import uuid from 'uuid';
import type {
  CreateCommentsArray,
  Description,
  EntriesArray,
  ExceptionListItemSchema,
  ExceptionListItemType,
  ItemId,
  ListId,
  MetaOrUndefined,
  Name,
  NamespaceType,
  OsTypeArray,
  Tags,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import {
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
