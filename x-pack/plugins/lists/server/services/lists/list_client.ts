/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
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

import { ConfigType } from '../../config';
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
import {
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

export class ListClient {
  private readonly spaceId: string;
  private readonly user: string;
  private readonly config: ConfigType;
  private readonly esClient: ElasticsearchClient;

  constructor({ spaceId, user, config, esClient }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.esClient = esClient;
  }

  public getListIndex = (): string => {
    const {
      spaceId,
      config: { listIndex: listsIndexName },
    } = this;
    return getListIndex({ listsIndexName, spaceId });
  };

  public getListItemIndex = (): string => {
    const {
      spaceId,
      config: { listItemIndex: listsItemsIndexName },
    } = this;
    return getListItemIndex({ listsItemsIndexName, spaceId });
  };

  public getList = async ({ id }: GetListOptions): Promise<ListSchema | null> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getList({ esClient, id, listIndex });
  };

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

  public getListIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getIndexExists(esClient, listIndex);
  };

  public getListItemIndexExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getIndexExists(esClient, listItemIndex);
  };

  public createListBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return createBootstrapIndex(esClient, listIndex);
  };

  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return createBootstrapIndex(esClient, listItemIndex);
  };

  public getListPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getPolicyExists(esClient, listIndex);
  };

  public getListItemPolicyExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listsItemIndex = this.getListItemIndex();
    return getPolicyExists(esClient, listsItemIndex);
  };

  public getListTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return getTemplateExists(esClient, listIndex);
  };

  public getListItemTemplateExists = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getTemplateExists(esClient, listItemIndex);
  };

  public getListTemplate = (): Record<string, unknown> => {
    const listIndex = this.getListIndex();
    return getListTemplate(listIndex);
  };

  public getListItemTemplate = (): Record<string, unknown> => {
    const listItemIndex = this.getListItemIndex();
    return getListItemTemplate(listItemIndex);
  };

  public setListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListTemplate();
    const listIndex = this.getListIndex();
    return setTemplate(esClient, listIndex, template);
  };

  public setListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const template = this.getListItemTemplate();
    const listItemIndex = this.getListItemIndex();
    return setTemplate(esClient, listItemIndex, template);
  };

  public setListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return setPolicy(esClient, listIndex, listPolicy);
  };

  public setListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return setPolicy(esClient, listItemIndex, listsItemsPolicy);
  };

  public deleteListIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deleteAllIndex(esClient, `${listIndex}-*`);
  };

  public deleteListItemIndex = async (): Promise<boolean> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteAllIndex(esClient, `${listItemIndex}-*`);
  };

  public deleteListPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deletePolicy(esClient, listIndex);
  };

  public deleteListItemPolicy = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deletePolicy(esClient, listItemIndex);
  };

  public deleteListTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listIndex = this.getListIndex();
    return deleteTemplate(esClient, listIndex);
  };

  public deleteListItemTemplate = async (): Promise<unknown> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteTemplate(esClient, listItemIndex);
  };

  public deleteListItem = async ({ id }: DeleteListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItem({ esClient, id, listItemIndex });
  };

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

  public getListItem = async ({ id }: GetListItemOptions): Promise<ListItemSchema | null> => {
    const { esClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItem({
      esClient,
      id,
      listItemIndex,
    });
  };

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
