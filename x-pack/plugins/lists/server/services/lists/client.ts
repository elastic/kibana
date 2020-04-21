/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, ScopedClusterClient } from 'src/core/server';

import { SecurityPluginSetup } from '../../../../security/server';
import { SpacesServiceSetup } from '../../../../spaces/server';
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
import { getUser } from '../../services/utils';
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

// TODO: Consider an interface and a factory
export class ListClient {
  private readonly spaces: SpacesServiceSetup | undefined | null;
  private readonly config: ConfigType;
  private readonly dataClient: Pick<
    ScopedClusterClient,
    'callAsCurrentUser' | 'callAsInternalUser'
  >;
  private readonly request: KibanaRequest;
  private readonly security: SecurityPluginSetup;

  constructor({ request, spaces, config, dataClient, security }: ConstructorOptions) {
    this.request = request;
    this.spaces = spaces;
    this.config = config;
    this.dataClient = dataClient;
    this.security = security;
  }

  public getListIndex = (): string => {
    const {
      spaces,
      request,
      config: { listIndex: listsIndexName },
    } = this;
    return getListIndex({ listsIndexName, request, spaces });
  };

  public getListItemIndex = (): string => {
    const {
      spaces,
      request,
      config: { listItemIndex: listsItemsIndexName },
    } = this;
    return getListItemIndex({ listsItemsIndexName, request, spaces });
  };

  public getList = async ({ id }: GetListOptions): Promise<ListSchema | null> => {
    const { dataClient } = this;
    const listIndex = this.getListIndex();
    return getList({ dataClient, id, listIndex });
  };

  public createList = async ({
    id,
    name,
    description,
    type,
    meta,
  }: CreateListOptions): Promise<ListSchema> => {
    const { dataClient, security, request } = this;
    const listIndex = this.getListIndex();
    const user = getUser({ request, security });
    return createList({ dataClient, description, id, listIndex, meta, name, type, user });
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
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return getIndexExists(callAsCurrentUser, listIndex);
  };

  public getListItemIndexExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return getIndexExists(callAsCurrentUser, listItemIndex);
  };

  public createListBootStrapIndex = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return createBootstrapIndex(callAsCurrentUser, listIndex);
  };

  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return createBootstrapIndex(callAsCurrentUser, listItemIndex);
  };

  public getListPolicyExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return getPolicyExists(callAsCurrentUser, listIndex);
  };

  public getListItemPolicyExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemIndex = this.getListItemIndex();
    return getPolicyExists(callAsCurrentUser, listsItemIndex);
  };

  public getListTemplateExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return getTemplateExists(callAsCurrentUser, listIndex);
  };

  public getListItemTemplateExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return getTemplateExists(callAsCurrentUser, listItemIndex);
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
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const template = this.getListTemplate();
    const listIndex = this.getListIndex();
    return setTemplate(callAsCurrentUser, listIndex, template);
  };

  public setListItemTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const template = this.getListItemTemplate();
    const listItemIndex = this.getListItemIndex();
    return setTemplate(callAsCurrentUser, listItemIndex, template);
  };

  public setListPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return setPolicy(callAsCurrentUser, listIndex, listPolicy);
  };

  public setListItemPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return setPolicy(callAsCurrentUser, listItemIndex, listsItemsPolicy);
  };

  public deleteListIndex = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return deleteAllIndex(callAsCurrentUser, `${listIndex}-*`);
  };

  public deleteListItemIndex = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteAllIndex(callAsCurrentUser, `${listItemIndex}-*`);
  };

  public deleteListPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return deletePolicy(callAsCurrentUser, listIndex);
  };

  public deleteListItemPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return deletePolicy(callAsCurrentUser, listItemIndex);
  };

  public deleteListTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listIndex = this.getListIndex();
    return deleteTemplate(callAsCurrentUser, listIndex);
  };

  public deleteListItemTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteTemplate(callAsCurrentUser, listItemIndex);
  };

  public deleteListItem = async ({ id }: DeleteListItemOptions): Promise<ListItemSchema | null> => {
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItem({ dataClient, id, listItemIndex });
  };

  public deleteListItemByValue = async ({
    listId,
    value,
    type,
  }: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    return deleteListItemByValue({
      dataClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };

  public deleteList = async ({ id }: DeleteListOptions): Promise<ListSchema | null> => {
    const { dataClient } = this;
    const listIndex = this.getListIndex();
    const listItemIndex = this.getListItemIndex();
    return deleteList({
      dataClient,
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
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    exportListItemsToStream({
      dataClient,
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
    const { dataClient, security, request } = this;
    const listItemIndex = this.getListItemIndex();
    const user = getUser({ request, security });
    return importListItemsToStream({
      dataClient,
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
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValue({
      dataClient,
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
    const { dataClient, security, request } = this;
    const listItemIndex = this.getListItemIndex();
    const user = getUser({ request, security });
    return createListItem({
      dataClient,
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
    const { dataClient, security, request } = this;
    const user = getUser({ request, security });
    const listItemIndex = this.getListItemIndex();
    return updateListItem({
      dataClient,
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
    const { dataClient, security, request } = this;
    const user = getUser({ request, security });
    const listIndex = this.getListIndex();
    return updateList({
      dataClient,
      description,
      id,
      listIndex,
      meta,
      name,
      user,
    });
  };

  public getListItem = async ({ id }: GetListItemOptions): Promise<ListItemSchema | null> => {
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItem({
      dataClient,
      id,
      listItemIndex,
    });
  };

  public getListItemByValues = async ({
    type,
    listId,
    value,
  }: GetListItemsByValueOptions): Promise<ListItemArraySchema> => {
    const { dataClient } = this;
    const listItemIndex = this.getListItemIndex();
    return getListItemByValues({
      dataClient,
      listId,
      listItemIndex,
      type,
      value,
    });
  };
}
