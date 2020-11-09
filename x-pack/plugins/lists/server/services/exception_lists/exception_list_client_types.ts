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
  ExceptionListItemType,
  ExceptionListItemTypeOrUndefined,
  ExceptionListType,
  ExceptionListTypeOrUndefined,
  FilterOrUndefined,
  Id,
  IdOrUndefined,
  Immutable,
  ItemId,
  ItemIdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  NamespaceType,
  OsTypeArray,
  PageOrUndefined,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
  Tags,
  TagsOrUndefined,
  UpdateCommentsArray,
  Version,
  VersionOrUndefined,
  _VersionOrUndefined,
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
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListType;
  immutable: Immutable;
  version: Version;
}

export interface UpdateExceptionListOptions {
  _version: _VersionOrUndefined;
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  namespaceType: NamespaceType;
  name: NameOrUndefined;
  osTypes: OsTypeArray;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListTypeOrUndefined;
  version: VersionOrUndefined;
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

export interface DeleteExceptionListItemByIdOptions {
  id: Id;
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
  comments: CreateCommentsArray;
  entries: EntriesArray;
  itemId: ItemId;
  listId: ListId;
  namespaceType: NamespaceType;
  name: Name;
  osTypes: OsTypeArray;
  description: Description;
  meta: MetaOrUndefined;
  tags: Tags;
  type: ExceptionListItemType;
}

export interface CreateEndpointListItemOptions {
  comments: CreateCommentsArray;
  entries: EntriesArray;
  itemId: ItemId;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  osTypes: OsTypeArray;
  tags: Tags;
  type: ExceptionListItemType;
}

export interface UpdateExceptionListItemOptions {
  _version: _VersionOrUndefined;
  comments: UpdateCommentsArray;
  entries: EntriesArray;
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  namespaceType: NamespaceType;
  name: NameOrUndefined;
  osTypes: OsTypeArray;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  tags: TagsOrUndefined;
  type: ExceptionListItemTypeOrUndefined;
}

export interface UpdateEndpointListItemOptions {
  _version: _VersionOrUndefined;
  comments: UpdateCommentsArray;
  entries: EntriesArray;
  id: IdOrUndefined;
  itemId: ItemIdOrUndefined;
  name: NameOrUndefined;
  osTypes: OsTypeArray;
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
