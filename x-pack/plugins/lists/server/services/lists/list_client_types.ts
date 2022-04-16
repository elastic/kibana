/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PassThrough, Readable } from 'stream';

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
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
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Version, VersionOrUndefined } from '@kbn/securitysolution-io-ts-types';

import type { ConfigType } from '../../config';

/**
 * Constructor options to {@link ListClient:constructor}
 */
export interface ConstructorOptions {
  /** The elastic search client to do the queries with */
  esClient: ElasticsearchClient;
  /** Configuration for determining things such as maximum sizes */
  config: ConfigType;
  /** Kibana space id the value lists are part of */
  spaceId: string;
  /** The user associated with the value list */
  user: string;
}

/**
 * ListClient.getList
 * {@link ListClient.getList}
 */
export interface GetListOptions {
  /** The id of the list */
  id: Id;
}

/**
 * ListClient.deleteList
 * {@link ListClient.deleteList}
 */
export interface DeleteListOptions {
  /** The id of the list to delete */
  id: Id;
}

/**
 * ListClient.deleteListItem
 * {@link ListClient.deleteListItem}
 */
export interface DeleteListItemOptions {
  /** The id of the list to delete from */
  id: Id;
}

/**
 * ListClient.createList
 * {@link ListClient.createList}
 */
export interface CreateListOptions {
  id: IdOrUndefined;
  /** A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information. */
  deserializer: DeserializerOrUndefined;
  /** Set this to true if this is a list that is "immutable"/"pre-packaged" */
  immutable: Immutable;
  /** Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information. */
  serializer: SerializerOrUndefined;
  /** The name of the list */
  name: Name;
  /** The description of the list */
  description: Description;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** Additional meta data to associate with the list as an object of "key/value" pairs */
  meta: MetaOrUndefined;
  /** Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual. */
  version: Version;
}

/**
 * ListClient.createListIfItDoesNotExist
 * {@link ListClient.createListIfItDoesNotExist}
 */
export interface CreateListIfItDoesNotExistOptions {
  /** The id of the list to create or "undefined" if you want an "id" to be auto-created for you */
  id: Id;
  /** A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information. */
  deserializer: DeserializerOrUndefined;
  /** Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information. */
  serializer: SerializerOrUndefined;
  /** The name of the list */
  name: Name;
  /** The description of the list */
  description: Description;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** Additional meta data to associate with the list as an object of "key/value" pairs */
  meta: MetaOrUndefined;
  /** Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual. */
  version: Version;
  /** Set this to true if this is a list that is "immutable"/"pre-packaged" */
  immutable: Immutable;
}

/**
 * ListClient.deleteListItemByValue
 * {@link ListClient.deleteListItemByValue}
 */
export interface DeleteListItemByValueOptions {
  /** The "list_id"/list container to delete from */
  listId: string;
  /** The value to delete the list items by */
  value: string;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
}

/**
 * ListClient.getListItemByValue
 * {@link ListClient.getListItemByValue}
 */
export interface GetListItemByValueOptions {
  /** The list id to search for the list item by value. */
  listId: string;
  /** The list value to find the list item by. */
  value: string;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
}

/**
 * ListClient.exportListItemsToStream
 * {@link ListClient.exportListItemsToStream}
 */
export interface ExportListItemsToStreamOptions {
  /** Optional string to append at the end of each item such as a newline "\n". If undefined is passed, no string is appended. */
  stringToAppend: string | null | undefined;
  /** The list id to export all the item from */
  listId: string;
  /** The stream to push the export into */
  stream: PassThrough;
}

/**
 * ListClient.importListItemsToStream
 * {@link ListClient.importListItemsToStream}
 */
export interface ImportListItemsToStreamOptions {
  listId: ListIdOrUndefined;
  /** A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information. */
  deserializer: DeserializerOrUndefined;
  /** Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information. */
  serializer: SerializerOrUndefined;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** The stream to pull the import from */
  stream: Readable;
  /** Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values. */
  meta: MetaOrUndefined;
  /** Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual. */
  version: Version;
}

/**
 * ListClient.createListItem
 * {@link ListClient.createListItem}
 */
export interface CreateListItemOptions {
  /** Optional Elasticsearch id, if none is given an autogenerated one will be used. */
  id: IdOrUndefined;
  /** A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information. */
  deserializer: DeserializerOrUndefined;
  /** Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information. */
  serializer: SerializerOrUndefined;
  /** The "list_id" this list item belongs to. */
  listId: string;
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** The value of the list item. */
  value: string;
  /** Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values. */
  meta: MetaOrUndefined;
}

/**
 * ListClient.updateListItem
 * {@link ListClient.updateListItem}
 */
export interface UpdateListItemOptions {
  /** This is the version, useful for optimistic concurrency control. */
  _version: _VersionOrUndefined;
  /** id of the list to replace the list item with. */
  id: Id;
  /** The value of the list item to replace. */
  value: string | null | undefined;
  /** Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values. */
  meta: MetaOrUndefined;
}

/**
 * ListClient.updateList
 * {@link ListClient.updateList}
 */
export interface UpdateListOptions {
  /** This is the version, useful for optimistic concurrency control. */
  _version: _VersionOrUndefined;
  /** id of the list to replace the list container data with. */
  id: Id;
  /** The new name, or "undefined" if this should not be updated. */
  name: NameOrUndefined;
  /** The new description, or "undefined" if this should not be updated. */
  description: DescriptionOrUndefined;
  /** Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values. */
  meta: MetaOrUndefined;
  /** Updates the version of the list. */
  version: VersionOrUndefined;
}

/**
 * ListClient.getListItem
 * {@link ListClient.getListItem}
 */
export interface GetListItemOptions {
  /** The id of the list item to get. */
  id: Id;
}

/**
 * ListClient.getListItemByValues
 * {@link ListClient.getListItemByValues}
 */
export interface GetListItemsByValueOptions {
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** The id of the list container to search for list items. */
  listId: string;
  /** The value to search for list items based off. */
  value: string[];
}

/**
 * ListClient.findList
 * {@link ListClient.findListItem}
 */
export interface FindListOptions {
  /** The current index position to search from. */
  currentIndexPosition: number;
  /** A KQL string filter to find list items. */
  filter: Filter;
  /** How many per page to return. */
  perPage: PerPage;
  /** The current page number for the current find */
  page: Page;
  /** array of search_after terms, otherwise "undefined" if there is no search_after */
  searchAfter: string[] | undefined;
  /** Which field to sort on, "undefined" for no sort field */
  sortField: SortFieldOrUndefined;
  /** "asc" or "desc" to sort, otherwise "undefined" if there is no sort order */
  sortOrder: SortOrderOrUndefined;
}

/**
 * ListClient.findListItem
 * {@link ListClient.findListItem}
 */
export interface FindListItemOptions {
  /** The current index position to search from. */
  currentIndexPosition: number;
  /** A KQL string filter to find list items. */
  filter: Filter;
  /** The list id to search for the list items */
  listId: ListId;
  /** How many per page to return. */
  perPage: PerPage;
  /** The current page number for the current find */
  page: Page;
  /** array of search_after terms, otherwise "undefined" if there is no search_after */
  searchAfter: string[] | undefined;
  /** Which field to sort on, "undefined" for no sort field */
  sortField: SortFieldOrUndefined;
  /** "asc" or "desc" to sort, otherwise "undefined" if there is no sort order */
  sortOrder: SortOrderOrUndefined;
}

/**
 * ListClient.searchListItemByValues
 * {@link ListClient.findListItem}
 */
export interface SearchListItemByValuesOptions {
  /** The type of list such as "boolean", "double", "text", "keyword", etc... */
  type: Type;
  /** The id of the list container to search for list items. */
  listId: string;
  /** The value to search for list items based off. */
  value: unknown[];
}
