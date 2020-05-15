/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import { ListItemArraySchema, ListItemSchema, ListSchema } from '../../../common/schemas';
import { ConfigType } from '../../config';
import {
  createList,
  deleteList,
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
  getListItem,
  getListItemByValue,
  getListItemByValues,
  getListItemIndex,
  getListItemTemplate,
  importListItemsToStream,
  updateListItem,
} from '../../services/items';
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
} from '../../siem_server_deps';
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
  GetListItemByValueOptions,
  GetListItemOptions,
  GetListItemsByValueOptions,
  GetListOptions,
  ImportListItemsToStreamOptions,
  UpdateListItemOptions,
  UpdateListOptions,
} from './client_types';

export class ListClient {
  private readonly spaceId: string;
  private readonly user: string;
  private readonly config: ConfigType;
  private readonly callCluster: APICaller;

  constructor({ spaceId, user, config, callCluster }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.callCluster = callCluster;
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
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return getList({ callCluster, id, listIndex });
  };

  public createList = async ({
    id,
    name,
    description,
    type,
    meta,
  }: CreateListOptions): Promise<ListSchema> => {
    const { callCluster, user } = this;
    const listIndex = this.getListIndex();
    return createList({ callCluster, description, id, listIndex, meta, name, type, user });
  };

  public createListIfItDoesNotExist = async ({
    id,
    name,
    description,
    type,
    meta,
  }: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
    const list = await this.getList({ id });
    if (list == null) {
      return this.createList({ description, id, meta, name, type });
    } else {
      return list;
    }
  };

  public getListIndexExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return getIndexExists(callCluster, listIndex);
  };

  public getListItemIndexExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return getIndexExists(callCluster, listItemIndex);
  };

  public createListBootStrapIndex = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return createBootstrapIndex(callCluster, listIndex);
  };

  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return createBootstrapIndex(callCluster, listItemIndex);
  };

  public getListPolicyExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return getPolicyExists(callCluster, listIndex);
  };

  public getListItemPolicyExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listsItemIndex = this.getListItemIndex();
    return getPolicyExists(callCluster, listsItemIndex);
  };

  public getListTemplateExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return getTemplateExists(callCluster, listIndex);
  };

  public getListItemTemplateExists = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return getTemplateExists(callCluster, listItemIndex);
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
    const { callCluster } = this;
    const template = this.getListTemplate();
    const listIndex = this.getListIndex();
    return setTemplate(callCluster, listIndex, template);
  };

  public setListItemTemplate = async (): Promise<unknown> => {
    const { callCluster } = this;
    const template = this.getListItemTemplate();
    const listItemIndex = this.getListItemIndex();
    return setTemplate(callCluster, listItemIndex, template);
  };

  public setListPolicy = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return setPolicy(callCluster, listIndex, listPolicy);
  };

  public setListItemPolicy = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return setPolicy(callCluster, listItemIndex, listsItemsPolicy);
  };

  public deleteListIndex = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return deleteAllIndex(callCluster, `${listIndex}-*`);
  };

  public deleteListItemIndex = async (): Promise<boolean> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteAllIndex(callCluster, `${listItemIndex}-*`);
  };

  public deleteListPolicy = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return deletePolicy(callCluster, listIndex);
  };

  public deleteListItemPolicy = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return deletePolicy(callCluster, listItemIndex);
  };

  public deleteListTemplate = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    return deleteTemplate(callCluster, listIndex);
  };

  public deleteListItemTemplate = async (): Promise<unknown> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteTemplate(callCluster, listItemIndex);
  };

  public deleteListItem = async ({ id }: DeleteListItemOptions): Promise<ListItemSchema | null> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItem({ callCluster, id, listItemIndex });
  };

  public deleteListItemByValue = async ({
    listId,
    value,
    type,
  }: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItemByValue({
      callCluster,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  public deleteList = async ({ id }: DeleteListOptions): Promise<ListSchema | null> => {
    const { callCluster } = this;
    const listIndex = this.getListIndex();
    const listItemIndex = this.getListItemIndex();
    return deleteList({
      callCluster,
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
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    exportListItemsToStream({
      callCluster,
      listId,
      listItemIndex,
      stream,
      stringToAppend,
    });
  };

  public importListItemsToStream = async ({
    type,
    listId,
    stream,
    meta,
  }: ImportListItemsToStreamOptions): Promise<void> => {
    const { callCluster, user } = this;
    const listItemIndex = this.getListItemIndex();
    return importListItemsToStream({
      callCluster,
      listId,
      listItemIndex,
      meta,
      stream,
      type,
      user,
    });
  };

  public getListItemByValue = async ({
    listId,
    value,
    type,
  }: GetListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValue({
      callCluster,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  public createListItem = async ({
    id,
    listId,
    value,
    type,
    meta,
  }: CreateListItemOptions): Promise<ListItemSchema> => {
    const { callCluster, user } = this;
    const listItemIndex = this.getListItemIndex();
    return createListItem({
      callCluster,
      id,
      listId,
      listItemIndex,
      meta,
      type,
      user,
      value,
    });
  };

  public updateListItem = async ({
    id,
    value,
    meta,
  }: UpdateListItemOptions): Promise<ListItemSchema | null> => {
    const { callCluster, user } = this;
    const listItemIndex = this.getListItemIndex();
    return updateListItem({
      callCluster,
      id,
      listItemIndex,
      meta,
      user,
      value,
    });
  };

  public updateList = async ({
    id,
    name,
    description,
    meta,
  }: UpdateListOptions): Promise<ListSchema | null> => {
    const { callCluster, user } = this;
    const listIndex = this.getListIndex();
    return updateList({
      callCluster,
      description,
      id,
      listIndex,
      meta,
      name,
      user,
    });
  };

  public getListItem = async ({ id }: GetListItemOptions): Promise<ListItemSchema | null> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItem({
      callCluster,
      id,
      listItemIndex,
    });
  };

  public getListItemByValues = async ({
    type,
    listId,
    value,
  }: GetListItemsByValueOptions): Promise<ListItemArraySchema> => {
    const { callCluster } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValues({
      callCluster,
      listId,
      listItemIndex,
      type,
      value,
    });
  };
}
