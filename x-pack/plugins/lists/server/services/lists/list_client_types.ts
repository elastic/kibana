/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough, Readable } from 'stream';

import { LegacyAPICaller } from 'kibana/server';

import {
  Description,
  DescriptionOrUndefined,
  DeserializerOrUndefined,
  Filter,
  Id,
  IdOrUndefined,
  Immutable,
  ListId,
  ListIdOrUndefined,
  MetaOrUndefined,
  Name,
  NameOrUndefined,
  Page,
  PerPage,
  SerializerOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
  Type,
  Version,
  VersionOrUndefined,
  _VersionOrUndefined,
} from '../../../common/schemas';
import { ConfigType } from '../../config';

export interface ConstructorOptions {
  callCluster: LegacyAPICaller;
  config: ConfigType;
  spaceId: string;
  user: string;
}

export interface GetListOptions {
  id: Id;
}

export interface DeleteListOptions {
  id: Id;
}

export interface DeleteListItemOptions {
  id: Id;
}

export interface CreateListOptions {
  id: IdOrUndefined;
  deserializer: DeserializerOrUndefined;
  immutable: Immutable;
  serializer: SerializerOrUndefined;
  name: Name;
  description: Description;
  type: Type;
  meta: MetaOrUndefined;
  version: Version;
}

export interface CreateListIfItDoesNotExistOptions {
  id: Id;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  name: Name;
  description: Description;
  type: Type;
  meta: MetaOrUndefined;
  version: Version;
  immutable: Immutable;
}

export interface DeleteListItemByValueOptions {
  listId: string;
  value: string;
  type: Type;
}

export interface GetListItemByValueOptions {
  listId: string;
  value: string;
  type: Type;
}

export interface ExportListItemsToStreamOptions {
  stringToAppend: string | null | undefined;
  listId: string;
  stream: PassThrough;
}

export interface ImportListItemsToStreamOptions {
  listId: ListIdOrUndefined;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  type: Type;
  stream: Readable;
  meta: MetaOrUndefined;
  version: Version;
}

export interface CreateListItemOptions {
  id: IdOrUndefined;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  listId: string;
  type: Type;
  value: string;
  meta: MetaOrUndefined;
}

export interface UpdateListItemOptions {
  _version: _VersionOrUndefined;
  id: Id;
  value: string | null | undefined;
  meta: MetaOrUndefined;
}

export interface UpdateListOptions {
  _version: _VersionOrUndefined;
  id: Id;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  meta: MetaOrUndefined;
  version: VersionOrUndefined;
}

export interface GetListItemOptions {
  id: Id;
}

export interface GetListItemsByValueOptions {
  type: Type;
  listId: string;
  value: string[];
}

export interface FindListOptions {
  currentIndexPosition: number;
  filter: Filter;
  perPage: PerPage;
  page: Page;
  searchAfter: string[] | undefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface FindListItemOptions {
  currentIndexPosition: number;
  filter: Filter;
  listId: ListId;
  perPage: PerPage;
  page: Page;
  searchAfter: string[] | undefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}
