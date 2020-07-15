/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { NamespaceTypeArray } from '../../../common/schemas/types/default_namespace_array';
import { NonEmptyStringArrayDecoded } from '../../../common/schemas/types/non_empty_string_array';
import { EmptyStringArrayDecoded } from '../../../common/schemas/types/empty_string_array';
import {
  CreateCommentsArray,
  Description,
  DescriptionOrUndefined,
  EntriesArray,
  EntriesArrayOrUndefined,
  ExceptionListItemType,
  ExceptionListItemTypeOrUndefined,
  ExceptionListType,
  ExceptionListTypeOrUndefined,
  FilterOrUndefined,
  IdOrUndefined,
  ItemId,
  ItemIdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  NamespaceType,
  PageOrUndefined,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
  Tags,
  TagsOrUndefined,
  UpdateCommentsArray,
  _Tags,
  _TagsOrUndefined,
} from '../../../common/schemas';

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

export interface DeleteEndpointListItemOptions {
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
}

export interface GetExceptionListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface GetEndpointListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
}

export interface CreateExceptionListItemOptions {
  _tags: _Tags;
  comments: CreateCommentsArray;
  entries: EntriesArray;
  itemId: ItemId;
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListItemType;
}

export interface CreateEndpointListItemOptions {
  _tags: _Tags;
  comments: CreateCommentsArray;
  entries: EntriesArray;
  itemId: ItemId;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListItemType;
}

export interface UpdateExceptionListItemOptions {
  _tags: _TagsOrUndefined;
  comments: UpdateCommentsArray;
  entries: EntriesArrayOrUndefined;
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  namespaceType: NamespaceType;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListItemTypeOrUndefined;
}

export interface UpdateEndpointListItemOptions {
  _tags: _TagsOrUndefined;
  comments: UpdateCommentsArray;
  entries: EntriesArrayOrUndefined;
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListItemTypeOrUndefined;
}

export interface FindExceptionListItemOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindEndpointListItemOptions {
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindExceptionListsItemOptions {
  listId: NonEmptyStringArrayDecoded;
  namespaceType: NamespaceTypeArray;
  filter: EmptyStringArrayDecoded;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindExceptionListOptions {
  namespaceType: NamespaceType;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}
