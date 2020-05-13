/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  CommentOrUndefined,
  Description,
  EntriesArray,
  ExceptionListType,
  IdOrUndefined,
  ItemId,
  ItemIdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  Tags,
  _Tags,
} from '../../../common/schemas';

import { NamespaceType } from './types';

export interface ConstructorOptions {
  user: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface GetExceptionListOptions {
  listId: ListIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface CreateExceptionListOptions {
  _tags: _Tags;
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListType;
}

export interface GetExceptionListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface CreateExceptionListItemOptions {
  _tags: _Tags;
  comment: CommentOrUndefined;
  entries: EntriesArray;
  itemId: ItemId;
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListType;
}
