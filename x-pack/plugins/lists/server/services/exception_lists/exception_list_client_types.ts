/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsOpenPointInTimeOptions,
} from 'kibana/server';
import type {
  CreateCommentsArray,
  Description,
  DescriptionOrUndefined,
  EntriesArray,
  ExceptionListItemType,
  ExceptionListItemTypeOrUndefined,
  ExceptionListType,
  ExceptionListTypeOrUndefined,
  ExportExceptionDetails,
  FilterOrUndefined,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  Id,
  IdOrUndefined,
  Immutable,
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
  ItemId,
  ItemIdOrUndefined,
  ListId,
  ListIdOrUndefined,
  MaxSizeOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  NamespaceType,
  NamespaceTypeArray,
  OsTypeArray,
  PageOrUndefined,
  PerPageOrUndefined,
  PitId,
  PitOrUndefined,
  SearchAfterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
  Tags,
  TagsOrUndefined,
  UpdateCommentsArray,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  EmptyStringArrayDecoded,
  NonEmptyStringArrayDecoded,
  Version,
  VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-types';

import type { ExtensionPointStorageClientInterface } from '../extension_points';

export interface ConstructorOptions {
  user: string;
  savedObjectsClient: SavedObjectsClientContract;
  serverExtensionsClient: ExtensionPointStorageClientInterface;
  /** Set to `false` if wanting to disable executing registered server extension points. Default is true. */
  enableServerExtensionPoints?: boolean;
  /** Should be provided when creating an instance from an HTTP request handler */
  request?: KibanaRequest;
}

export interface GetExceptionListOptions {
  listId: ListIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface GetExceptionListSummaryOptions {
  filter: FilterOrUndefined;
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
  pit?: PitOrUndefined;
  searchAfter?: SearchAfterOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindEndpointListItemOptions {
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  pit?: PitOrUndefined;
  searchAfter?: SearchAfterOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindExceptionListsItemOptions {
  listId: NonEmptyStringArrayDecoded;
  namespaceType: NamespaceTypeArray;
  filter: EmptyStringArrayDecoded;
  perPage: PerPageOrUndefined;
  pit?: PitOrUndefined;
  searchAfter?: SearchAfterOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindValueListExceptionListsItems {
  valueListId: Id;
  perPage: PerPageOrUndefined;
  pit?: PitOrUndefined;
  searchAfter?: SearchAfterOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindExceptionListOptions {
  namespaceType: NamespaceTypeArray;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  pit?: PitOrUndefined;
  searchAfter?: SearchAfterOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface ExportExceptionListAndItemsOptions {
  listId: ListIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
}

export interface ExportExceptionListAndItemsReturn {
  exportData: string;
  exportDetails: ExportExceptionDetails;
}

export interface ImportExceptionListAndItemsOptions {
  exceptionsToImport: Readable;
  maxExceptionsImportSize: number;
  overwrite: boolean;
}

export interface ImportExceptionListAndItemsAsArrayOptions {
  exceptionsToImport: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  maxExceptionsImportSize: number;
  overwrite: boolean;
}

export interface OpenPointInTimeOptions {
  namespaceType: NamespaceType;
  options: SavedObjectsOpenPointInTimeOptions | undefined;
}

export interface ClosePointInTimeOptions {
  pit: PitId;
}

export interface FindExceptionListItemPointInTimeFinderOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListItemSchema) => void;
  maxSize: MaxSizeOrUndefined;
}

export interface FindExceptionListPointInTimeFinderOptions {
  maxSize: MaxSizeOrUndefined;
  namespaceType: NamespaceTypeArray;
  filter: FilterOrUndefined;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListSchema) => void;
}

export interface FindExceptionListItemsPointInTimeFinderOptions {
  listId: NonEmptyStringArrayDecoded;
  namespaceType: NamespaceTypeArray;
  filter: EmptyStringArrayDecoded;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListItemSchema) => void;
  maxSize: MaxSizeOrUndefined;
}

export interface FindValueListExceptionListsItemsPointInTimeFinder {
  valueListId: Id;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListItemSchema) => void;
  maxSize: MaxSizeOrUndefined;
}
