/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  CommentOrUndefined,
  Description,
  DescriptionOrUndefined,
  EntriesArray,
  EntriesArrayOrUndefined,
  ExceptionListType,
  ExceptionListTypeOrUndefined,
  IdOrUndefined,
  ItemId,
  ItemIdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  Tags,
  TagsOrUndefined,
  _Tags,
  _TagsOrUndefined,
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

export interface UpdateExceptionListOptions {
  _tags: _TagsOrUndefined;
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  namespaceType: NamespaceType;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListTypeOrUndefined;
}

export interface DeleteExceptionListOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  namespaceType: NamespaceType;
}

export interface DeleteExceptionListItemOptions {
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  namespaceType: NamespaceType;
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

export interface UpdateExceptionListItemOptions {
  _tags: _TagsOrUndefined;
  comment: CommentOrUndefined;
  entries: EntriesArrayOrUndefined;
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  namespaceType: NamespaceType;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListTypeOrUndefined;
}

export interface FindExceptionListItemOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  filter: string | undefined;
  perPage: number | undefined;
  page: number | undefined;
  sortField: string | undefined;
  sortOrder: string | undefined;
}
