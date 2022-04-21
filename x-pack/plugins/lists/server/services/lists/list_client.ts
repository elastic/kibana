/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';
import {
  createBootstrapIndex,
  deleteAllIndex,
  deletePolicy,
  deleteTemplate,
  getIndexExists,
  getPolicyExists,
  getTemplateExists,
  setPolicy,
  setTemplate,
} from '@kbn/securitysolution-es-utils';
import type {
  FoundListItemSchema,
  FoundListSchema,
  ListItemArraySchema,
  ListItemSchema,
  ListSchema,
  SearchListItemArraySchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { ConfigType } from '../../config';
import {
  createList,
  deleteList,
  findList,
  getList,
  getListIndex,
  getListTemplate,
  updateList,
} from '../../services/lists';
import {
  createListItem,
  deleteListItem,
  deleteListItemByValue,
  exportListItemsToStream,
  findListItem,
  getListItem,
  getListItemByValue,
  getListItemByValues,
  getListItemIndex,
  getListItemTemplate,
  importListItemsToStream,
  searchListItemByValues,
  updateListItem,
} from '../../services/items';
import listsItemsPolicy from '../items/list_item_policy.json';

import listPolicy from './list_policy.json';
import type {
  ConstructorOptions,
  CreateListIfItDoesNotExistOptions,
  CreateListItemOptions,
  CreateListOptions,
  DeleteListItemByValueOptions,
  DeleteListItemOptions,
  DeleteListOptions,
  ExportListItemsToStreamOptions,
  FindListItemOptions,
  FindListOptions,
  GetListItemByValueOptions,
  GetListItemOptions,
  GetListItemsByValueOptions,
  GetListOptions,
  ImportListItemsToStreamOptions,
  SearchListItemByValuesOptions,
  UpdateListItemOptions,
  UpdateListOptions,
} from './list_client_types';
import { createListIfItDoesNotExist } from './create_list_if_it_does_not_exist';

/**
 * Class for use for value lists are are associated with exception lists.
 * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
 */
export class ListClient {
  /** Kibana space id the value lists are part of */
  private readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a value list */
  private readonly user: string;

  /** Configuration for determining things such as maximum sizes  */
  private readonly config: ConfigType;

  /** The elastic search client to do the queries with */
  private readonly esClient: ElasticsearchClient;

  /**
   * Constructs the value list
   * @param options
   * @param options.spaceId Kibana space id the value lists are part of
   * @param options.user The user associated with the value list
   * @param options.config Configuration for determining things such as maximum sizes
   * @param options.esClient The elastic search client to do the queries with
   */
  constructor({ spaceId, user, config, esClient }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.esClient = esClient;
  }

  /**
   * Returns the list index name
   * @returns The list index name
   */
  public getListIndex = (): string => {
    const {
      spaceId,
      config: { listIndex: listsIndexName },
    } = this;
    return getListIndex({ listsIndexName, spaceId });
  };

  /**
   * Returns the list item index name
   * @returns The list item index name
   */
  public getListItemIndex = (): string => {
    const {
      spaceId,
      config: { listItemIndex: listsItemsIndexName },
    } = this;
    return getListItemIndex({ listsItemsIndexName, spaceId });
  };

  /**
   * Given a list id, this will return the list container
   * @param options
   * @param options.id The id of the list
   * @returns The List container if found, otherwise null
   */
  public getList = async ({ id }: GetListOptions): Promise<ListSchema | null> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getList({ esClient, id, listIndex });
  };

  /**
   * Creates a list, if given at least the "name", "description", "type", and "version"
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * for more information around formats of the deserializer and serializer
   * @param options
   * @param options.id The id of the list to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.deserializer A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.immutable Set this to true if this is a list that is "immutable"/"pre-packaged".
   * @param options.serializer Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information.
   * @param options.name The name of the list
   * @param options.description The description of the list
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list as an object of "key/value" pairs
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   * @returns The list created
   */
  public createList = async ({
    id,
    deserializer,
    immutable,
    serializer,
    name,
    description,
    type,
    meta,
    version,
  }: CreateListOptions): Promise<ListSchema> => {
    const { esClient, user } = this;
    const listIndex = this.getListIndex();
    return createList({
      description,
      deserializer,
      esClient,
      id,
      immutable,
      listIndex,
      meta,
      name,
      serializer,
      type,
      user,
      version,
    });
  };

  /**
   * Creates a list, if given at least the "name", "description", "type", and "version"
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * for more information around formats of the deserializer and serializer.
   * This will create the list if it does not exist. If the list exists, this will ignore creating
   * anything and just return the existing list.
   * @param options
   * @param options.id The id of the list to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.deserializer A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.immutable Set this to true if this is a list that is "immutable"/"pre-packaged".
   * @param options.serializer Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information.
   * @param options.name The name of the list
   * @param options.description The description of the list
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list as an object of "key/value" pairs
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   * @returns The list created
   */
  public createListIfItDoesNotExist = async ({
    id,
    deserializer,
    serializer,
    name,
    description,
    immutable,
    type,
    meta,
    version,
  }: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
    const { esClient, user } = this;
    const listIndex = this.getListIndex();
    return createListIfItDoesNotExist({
      description,
      deserializer,
      esClient,
      id,
      immutable,
      listIndex,
      meta,
      name,
      serializer,
      type,
      user,
      version,
    });
  };

  /**
   * True if the list index exists, otherwise false
   * @returns True if the list index exists, otherwise false
   */
  public getListIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getIndexExists(esClient, listIndex);
  };

  /**
   * True if the list index item exists, otherwise false
   * @returns True if the list item index exists, otherwise false
   */
  public getListItemIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getIndexExists(esClient, listItemIndex);
  };

  /**
   * Creates the list boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   */
  public createListBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return createBootstrapIndex(esClient, listIndex);
  };

  /**
   * Creates the list item boot strap index for ILM policies.
   * @returns The contents of the bootstrap response from Elasticsearch
   */
  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return createBootstrapIndex(esClient, listItemIndex);
  };

  /**
   * Returns true if the list policy for ILM exists, otherwise false
   * @returns True if the list policy for ILM exists, otherwise false.
   */
  public getListPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getPolicyExists(esClient, listIndex);
  };

  /**
   * Returns true if the list item policy for ILM exists, otherwise false
   * @returns True if the list item policy for ILM exists, otherwise false.
   */
  public getListItemPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listsItemIndex = this.getListItemIndex();
    return getPolicyExists(esClient, listsItemIndex);
  };

  /**
   * Returns true if the list template for ILM exists, otherwise false
   * @returns True if the list template for ILM exists, otherwise false.
   */
  public getListTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getTemplateExists(esClient, listIndex);
  };

  /**
   * Returns true if the list item template for ILM exists, otherwise false
   * @returns True if the list item template for ILM exists, otherwise false.
   */
  public getListItemTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getTemplateExists(esClient, listItemIndex);
  };

  /**
   * Returns the list template for ILM.
   * @returns The contents of the list template for ILM.
   */
  public getListTemplate = (): Record<string, unknown> => {
    const listIndex = this.getListIndex();
    return getListTemplate(listIndex);
  };

  /**
   * Returns the list item template for ILM.
   * @returns The contents of the list item template for ILM.
   */
  public getListItemTemplate = (): Record<string, unknown> => {
    const listItemIndex = this.getListItemIndex();
    return getListItemTemplate(listItemIndex);
  };

  /**
   * Sets the list template for ILM.
   * @returns The contents of the list template for ILM.
   */
  public setListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListTemplate();
    const listIndex = this.getListIndex();
    return setTemplate(esClient, listIndex, template);
  };

  /**
   * Sets the list item template for ILM.
   * @returns The contents of the list item template for ILM.
   */
  public setListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListItemTemplate();
    const listItemIndex = this.getListItemIndex();
    return setTemplate(esClient, listItemIndex, template);
  };

  /**
   * Sets the list policy
   * @returns The contents of the list policy set
   */
  public setListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return setPolicy(esClient, listIndex, listPolicy);
  };

  /**
   * Sets the list item policy
   * @returns The contents of the list policy set
   */
  public setListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return setPolicy(esClient, listItemIndex, listsItemsPolicy);
  };

  /**
   * Deletes the list index
   * @returns True if the list index was deleted, otherwise false
   */
  public deleteListIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deleteAllIndex(esClient, `${listIndex}-*`);
  };

  /**
   * Deletes the list item index
   * @returns True if the list item index was deleted, otherwise false
   */
  public deleteListItemIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteAllIndex(esClient, `${listItemIndex}-*`);
  };

  /**
   * Deletes the list policy
   * @returns The contents of the list policy
   */
  public deleteListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deletePolicy(esClient, listIndex);
  };

  /**
   * Deletes the list item policy
   * @returns The contents of the list item policy
   */
  public deleteListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deletePolicy(esClient, listItemIndex);
  };

  /**
   * Deletes the list template
   * @returns The contents of the list template
   */
  public deleteListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deleteTemplate(esClient, listIndex);
  };

  /**
   * Deletes the list item template
   * @returns The contents of the list item template
   */
  public deleteListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteTemplate(esClient, listItemIndex);
  };

  /**
   * Given a list item id, this will delete the single list item
   * @returns The list item if found, otherwise null
   */
  public deleteListItem = async ({ id }: DeleteListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItem({ esClient, id, listItemIndex });
  };

  /**
   * Given a list value, this will delete all list items that have that value
   * @param options
   * @param options.listId The "list_id"/list container to delete from
   * @param options.value The value to delete the list items by
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @returns The list items deleted.
   */
  public deleteListItemByValue = async ({
    listId,
    value,
    type,
  }: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItemByValue({
      esClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  /**
   * Given a list id, this will delete the list from the id
   * @param options
   * @param options.id The id of the list to delete
   * @returns The list deleted if found, otherwise null
   */
  public deleteList = async ({ id }: DeleteListOptions): Promise<ListSchema | null> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    const listItemIndex = this.getListItemIndex();
    return deleteList({
      esClient,
      id,
      listIndex,
      listItemIndex,
    });
  };

  /**
   * Exports list items to a stream
   * @param options
   * @param options.stringToAppend Optional string to append at the end of each item such as a newline "\n". If undefined is passed, no string is appended.
   * @param options.listId The list id to export all the item from
   * @param options.stream The stream to push the export into
   */
  public exportListItemsToStream = ({
    stringToAppend,
    listId,
    stream,
  }: ExportListItemsToStreamOptions): void => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    exportListItemsToStream({
      esClient,
      listId,
      listItemIndex,
      stream,
      stringToAppend,
    });
  };

  /**
   * Imports list items to a stream. If the list already exists, this will append the list items to the existing list.
   * If the list does not exist, this will auto-create the list and then add the items to that list.
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * for more information around formats of the deserializer and serializer.
   * @param options
   * @param options.deserializer A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.serializer Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information.
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.stream The stream to pull the import from
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values.
   * @param options.version Version number of the list, typically this should be 1 unless you are re-creating a list you deleted or something unusual.
   */
  public importListItemsToStream = async ({
    deserializer,
    serializer,
    type,
    listId,
    stream,
    meta,
    version,
  }: ImportListItemsToStreamOptions): Promise<ListSchema | null> => {
    const { esClient, user, config } = this;
    const listItemIndex = this.getListItemIndex();
    const listIndex = this.getListIndex();
    return importListItemsToStream({
      config,
      deserializer,
      esClient,
      listId,
      listIndex,
      listItemIndex,
      meta,
      serializer,
      stream,
      type,
      user,
      version,
    });
  };

  /**
   * Returns all list items found by value.
   * @param options
   * @param options.listId The list id to search for the list item by value.
   * @param options.value The list value to find the list item by.
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @returns The list items by value found.
   */
  public getListItemByValue = async ({
    listId,
    value,
    type,
  }: GetListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValue({
      esClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  /**
   * Creates a list item given at least "value", "type", and a "listId" where "listId" is the parent container that this list
   * item belongs to.
   * See {@link https://www.elastic.co/guide/en/security/current/lists-api-create-container.html}
   * for more information around formats of the deserializer and serializer.
   * @param options
   * @param options.id Optional Elasticsearch id, if none is given an autogenerated one will be used.
   * @param options.deserializer A custom deserializer for the list. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.serializer Determines how uploaded list item values are parsed. By default, list items are parsed using named regex groups. See online docs for more information.
   * @param options.listId The "list_id" this list item belongs to.
   * @param options.value The value of the list item.
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" for no meta values.
   */
  public createListItem = async ({
    id,
    deserializer,
    serializer,
    listId,
    value,
    type,
    meta,
  }: CreateListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient, user } = this;
    const listItemIndex = this.getListItemIndex();
    return createListItem({
      deserializer,
      esClient,
      id,
      listId,
      listItemIndex,
      meta,
      serializer,
      type,
      user,
      value,
    });
  };

  /**
   * Updates a list item's value given the id of the list item.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list item with.
   * @param options.value The value of the list item to replace.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   */
  public updateListItem = async ({
    _version,
    id,
    value,
    meta,
  }: UpdateListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient, user } = this;
    const listItemIndex = this.getListItemIndex();
    return updateListItem({
      _version,
      esClient,
      id,
      listItemIndex,
      meta,
      user,
      value,
    });
  };

  /**
   * Updates a list container's value given the id of the list.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the list to replace the list container data with.
   * @param options.name The new name, or "undefined" if this should not be updated.
   * @param options.description The new description, or "undefined" if this should not be updated.
   * @param options.meta Additional meta data to associate with the list items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   * @param options.version Updates the version of the list.
   */
  public updateList = async ({
    _version,
    id,
    name,
    description,
    meta,
    version,
  }: UpdateListOptions): Promise<ListSchema | null> => {
    const { esClient, user } = this;
    const listIndex = this.getListIndex();
    return updateList({
      _version,
      description,
      esClient,
      id,
      listIndex,
      meta,
      name,
      user,
      version,
    });
  };

  /**
   * Given a list item id, this returns the list item if it exists, otherwise "null".
   * @param options
   * @param options.id The id of the list item to get.
   * @returns The list item found if it exists, otherwise "null".
   */
  public getListItem = async ({ id }: GetListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItem({
      esClient,
      id,
      listItemIndex,
    });
  };

  /**
   * Given a list item value, this returns all list items found with that value.
   * @param options
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.listId The id of the list container to search for list items.
   * @param options.value The value to search for list items based off.
   * @returns All list items that match the value sent in.
   */
  public getListItemByValues = async ({
    type,
    listId,
    value,
  }: GetListItemsByValueOptions): Promise<ListItemArraySchema> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValues({
      esClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  /**
   * Given a list item value, this search for all list items found with that value.
   * @param options
   * @param options.type The type of list such as "boolean", "double", "text", "keyword", etc...
   * @param options.listId The id of the list container to search for list items.
   * @param options.value The value to search for list items based off.
   * @returns All list items that match the value sent in.
   */
  public searchListItemByValues = async ({
    type,
    listId,
    value,
  }: SearchListItemByValuesOptions): Promise<SearchListItemArraySchema> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return searchListItemByValues({
      esClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  /**
   * Finds lists based on a filter passed in. This is a bit complicated as it existed before
   * PIT (Point in Time) and other mechanisms. This uses an older way of doing "hops" and
   * accepting a "currentIndexPosition" which acts like a pointer to where the search should continue.
   * @param options
   * @param options.filter A KQL string filter to find lists.
   * @param options.currentIndexPosition The current index position to search from.
   * @param options.perPage How many per page to return.
   * @param options.sortField Which field to sort on, "undefined" for no sort field
   * @param options.sortOrder "asc" or "desc" to sort, otherwise "undefined" if there is no sort order
   * @param options.searchAfter array of search_after terms, otherwise "undefined" if there is no search_after
   * @returns All lists found based on the passed in filter.
   */
  public findList = async ({
    filter,
    currentIndexPosition,
    perPage,
    page,
    sortField,
    sortOrder,
    searchAfter,
  }: FindListOptions): Promise<FoundListSchema> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return findList({
      currentIndexPosition,
      esClient,
      filter,
      listIndex,
      page,
      perPage,
      searchAfter,
      sortField,
      sortOrder,
    });
  };

  /**
   * Finds list items based on a filter passed in. This is a bit complicated as it existed before
   * PIT (Point in Time) and other mechanisms. This uses an older way of doing "hops" and
   * accepting a "currentIndexPosition" which acts like a pointer to where the search should continue.
   * @param options
   * @param options.listId The list id to search for the list items
   * @param options.filter A KQL string filter to find list items.
   * @param options.currentIndexPosition The current index position to search from.
   * @param options.perPage How many per page to return.
   * @param options.page The current page number for the current find
   * @param options.sortField Which field to sort on, "undefined" for no sort field
   * @param options.sortOrder "asc" or "desc" to sort, otherwise "undefined" if there is no sort order
   * @param options.searchAfter array of search_after terms, otherwise "undefined" if there is no search_after
   * @returns All list items found based on the passed in filter.
   */
  public findListItem = async ({
    listId,
    filter,
    currentIndexPosition,
    perPage,
    page,
    sortField,
    sortOrder,
    searchAfter,
  }: FindListItemOptions): Promise<FoundListItemSchema | null> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    const listItemIndex = this.getListItemIndex();
    return findListItem({
      currentIndexPosition,
      esClient,
      filter,
      listId,
      listIndex,
      listItemIndex,
      page,
      perPage,
      searchAfter,
      sortField,
      sortOrder,
    });
  };
}
