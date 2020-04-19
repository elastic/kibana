/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, ScopedClusterClient } from 'src/core/server';

import { SecurityPluginSetup } from '../../../../security/server';
import { SpacesServiceSetup } from '../../../../spaces/server';
import { ListsSchema, ListsItemsSchema, ListsItemsArraySchema } from '../../../common/schemas';
import { ConfigType } from '../../config';
import {
  getListIndex,
  getList,
  createList,
  getListsTemplate,
  deleteList,
  updateList,
} from '../../services/lists';
import {
  getListItemIndex,
  getListsItemsTemplate,
  deleteListItem,
  deleteListItemByValue,
  exportListItemsToStream,
  getListItemByValue,
  createListItem,
  importListItemsToStream,
  updateListItem,
  getListItem,
  getListItemsByValues,
} from '../../services/items';
import { getUser } from '../../services/utils';
import {
  deleteTemplate,
  deletePolicy,
  deleteAllIndex,
  setPolicy,
  setTemplate,
  getTemplateExists,
  getPolicyExists,
  createBootstrapIndex,
  getIndexExists,
} from '../../siem_server_deps';
import listsItemsPolicy from '../items/lists_items_policy.json';

import listsPolicy from './lists_policy.json';
import {
  ConstructorOptions,
  CreateListOptions,
  GetListOptions,
  DeleteListItemByValueOptions,
  DeleteListOptions,
  DeleteListItemOptions,
  GetListItemByValueOptions,
  CreateListItemOptions,
  ImportListItemsToStreamOptions,
  ExportListItemsToStreamOptions,
  CreateListIfItDoesNotExistOptions,
  UpdateListItemOptions,
  UpdateListOptions,
  GetListItemOptions,
  GetListItemsByValueOptions,
} from './client_types';

// TODO: Consider an interface and a factory
export class ListsClient {
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
      config: { listsIndex: listsIndexName },
    } = this;
    return getListIndex({ spaces, request, listsIndexName });
  };

  public getListItemIndex = (): string => {
    const {
      spaces,
      request,
      config: { listsItemsIndex: listsItemsIndexName },
    } = this;
    return getListItemIndex({ spaces, request, listsItemsIndexName });
  };

  public getList = async ({ id }: GetListOptions): Promise<ListsSchema | null> => {
    const { dataClient } = this;
    const listsIndex = this.getListIndex();
    return getList({ id, dataClient, listsIndex });
  };

  public createList = async ({
    id,
    name,
    description,
    type,
    meta,
  }: CreateListOptions): Promise<ListsSchema> => {
    const { dataClient, security, request } = this;
    const listsIndex = this.getListIndex();
    const user = getUser({ security, request });
    return createList({ name, description, id, dataClient, listsIndex, user, type, meta });
  };

  public createListIfItDoesNotExist = async ({
    id,
    name,
    description,
    type,
    meta,
  }: CreateListIfItDoesNotExistOptions): Promise<ListsSchema> => {
    const list = await this.getList({ id });
    if (list == null) {
      return this.createList({ id, name, description, type, meta });
    } else {
      return list;
    }
  };

  public getListIndexExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return getIndexExists(callAsCurrentUser, listsIndex);
  };

  public getListItemIndexExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return getIndexExists(callAsCurrentUser, listsItemsIndex);
  };

  public createListBootStrapIndex = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return createBootstrapIndex(callAsCurrentUser, listsIndex);
  };

  public createListItemBootStrapIndex = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return createBootstrapIndex(callAsCurrentUser, listsItemsIndex);
  };

  public getListPolicyExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return getPolicyExists(callAsCurrentUser, listsIndex);
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
    const listsIndex = this.getListIndex();
    return getTemplateExists(callAsCurrentUser, listsIndex);
  };

  public getListItemTemplateExists = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return getTemplateExists(callAsCurrentUser, listsItemsIndex);
  };

  public getListTemplate = (): Record<string, unknown> => {
    const listsIndex = this.getListIndex();
    return getListsTemplate(listsIndex);
  };

  public getListItemTemplate = (): Record<string, unknown> => {
    const listsItemsIndex = this.getListItemIndex();
    return getListsItemsTemplate(listsItemsIndex);
  };

  public setListTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const template = this.getListTemplate();
    const listsIndex = this.getListIndex();
    return setTemplate(callAsCurrentUser, listsIndex, template);
  };

  public setListItemTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const template = this.getListItemTemplate();
    const listsItemsIndex = this.getListItemIndex();
    return setTemplate(callAsCurrentUser, listsItemsIndex, template);
  };

  public setListPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return setPolicy(callAsCurrentUser, listsIndex, listsPolicy);
  };

  public setListItemPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return setPolicy(callAsCurrentUser, listsItemsIndex, listsItemsPolicy);
  };

  public deleteListIndex = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return deleteAllIndex(callAsCurrentUser, `${listsIndex}-*`);
  };

  public deleteListItemIndex = async (): Promise<boolean> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return deleteAllIndex(callAsCurrentUser, `${listsItemsIndex}-*`);
  };

  public deleteListPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return deletePolicy(callAsCurrentUser, listsIndex);
  };

  public deleteListItemPolicy = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return deletePolicy(callAsCurrentUser, listsItemsIndex);
  };

  public deleteListTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsIndex = this.getListIndex();
    return deleteTemplate(callAsCurrentUser, listsIndex);
  };

  public deleteListItemTemplate = async (): Promise<unknown> => {
    const {
      dataClient: { callAsCurrentUser },
    } = this;
    const listsItemsIndex = this.getListItemIndex();
    return deleteTemplate(callAsCurrentUser, listsItemsIndex);
  };

  public deleteListItem = async ({
    id,
  }: DeleteListItemOptions): Promise<ListsItemsSchema | null> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return deleteListItem({ id, dataClient, listsItemsIndex });
  };

  public deleteListItemByValue = async ({
    listId,
    value,
    type,
  }: DeleteListItemByValueOptions): Promise<ListsItemsArraySchema> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return deleteListItemByValue({
      type,
      listId,
      value,
      dataClient,
      listsItemsIndex,
    });
  };

  public deleteList = async ({ id }: DeleteListOptions): Promise<ListsSchema | null> => {
    const { dataClient } = this;
    const listsIndex = this.getListIndex();
    const listsItemsIndex = this.getListItemIndex();
    return deleteList({
      id,
      listsIndex,
      dataClient,
      listsItemsIndex,
    });
  };

  public exportListItemsToStream = ({
    stringToAppend,
    listId,
    stream,
  }: ExportListItemsToStreamOptions): void => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    exportListItemsToStream({
      listId,
      stream,
      dataClient,
      listsItemsIndex,
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
    const listsItemsIndex = this.getListItemIndex();
    const user = getUser({ security, request });
    return importListItemsToStream({
      listId,
      type,
      stream,
      dataClient,
      listsItemsIndex,
      user,
      meta,
    });
  };

  public getListItemByValue = async ({
    listId,
    value,
    type,
  }: GetListItemByValueOptions): Promise<ListsItemsArraySchema> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return getListItemByValue({
      type,
      listId,
      value,
      dataClient,
      listsItemsIndex,
    });
  };

  public createListItem = async ({
    id,
    listId,
    value,
    type,
    meta,
  }: CreateListItemOptions): Promise<ListsItemsSchema> => {
    const { dataClient, security, request } = this;
    const listsItemsIndex = this.getListItemIndex();
    const user = getUser({ security, request });
    return createListItem({
      id,
      listId,
      type,
      value,
      dataClient,
      listsItemsIndex,
      user,
      meta,
    });
  };

  public updateListItem = async ({
    id,
    value,
    meta,
  }: UpdateListItemOptions): Promise<ListsItemsSchema | null> => {
    const { dataClient, security, request } = this;
    const user = getUser({ security, request });
    const listsItemsIndex = this.getListItemIndex();
    return updateListItem({
      user,
      id,
      value,
      dataClient,
      listsItemsIndex,
      meta,
    });
  };

  public updateList = async ({
    id,
    name,
    description,
    meta,
  }: UpdateListOptions): Promise<ListsSchema | null> => {
    const { dataClient, security, request } = this;
    const user = getUser({ security, request });
    const listsIndex = this.getListIndex();
    return updateList({
      id,
      name,
      description,
      dataClient,
      listsIndex,
      user,
      meta,
    });
  };

  public getListItem = async ({ id }: GetListItemOptions): Promise<ListsItemsSchema | null> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return getListItem({
      id,
      dataClient,
      listsItemsIndex,
    });
  };

  public getListItemsByValues = async ({
    type,
    listId,
    value,
  }: GetListItemsByValueOptions): Promise<ListsItemsArraySchema> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return getListItemsByValues({
      type,
      listId,
      value,
      dataClient,
      listsItemsIndex,
    });
  };
}
