/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, ScopedClusterClient } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { deleteTemplate } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/delete_template';
import { deletePolicy } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/delete_policy';
import { deleteAllIndex } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/delete_all_index';
import { setPolicy } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/set_policy';
import { setTemplate } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/set_template';
import { getTemplateExists } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/get_template_exists';
import { getPolicyExists } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/get_policy_exists';
import { createBootstrapIndex } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/create_bootstrap_index';
import { getIndexExists } from '../../../legacy/plugins/siem/server/lib/detection_engine/index/get_index_exists';
import { SpacesServiceSetup } from '../../spaces/server';
import { ListsSchema, ListsItemsSchema } from '../common/schemas';

import listsItemsPolicy from './items/lists_items_policy.json';
import listsPolicy from './lists/lists_policy.json';
import { ConfigType } from './config';
import {
  getListIndex,
  getList,
  createList,
  getListsTemplate,
  deleteList,
  updateList,
} from './lists';
import {
  getListItemIndex,
  getListsItemsTemplate,
  deleteListItem,
  deleteListItemByValue,
  writeListItemsToStream,
  getListItemByValue,
  createListItem,
  writeLinesToBulkListItems,
  updateListItem,
  getListItem,
  getListItemsByValues,
} from './items';
import {
  ConstructorOptions,
  CreateListOptions,
  GetListOptions,
  DeleteListItemByValueOptions,
  DeleteListOptions,
  DeleteListItemOptions,
  GetListItemByValueOptions,
  CreateListItemOptions,
  WriteLinesToBulkListItemsOptions,
  WriteListItemsToStreamOptions,
  CreateListIfItDoesNotExistOptions,
  UpdateListItemOptions,
  UpdateListOptions,
  GetListItemOptions,
  GetListItemsByValueOptions,
} from './client_types';
import { getUser } from './utils';

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
  }: CreateListOptions): Promise<ListsSchema> => {
    const { dataClient, security, request } = this;
    const listsIndex = this.getListIndex();
    const user = getUser({ security, request });
    return createList({ name, description, id, dataClient, listsIndex, user, type });
  };

  public createListIfItDoesNotExist = async ({
    id,
    name,
    description,
    type,
  }: CreateListIfItDoesNotExistOptions): Promise<ListsSchema> => {
    const list = await this.getList({ id });
    if (list == null) {
      return this.createList({ id, name, description, type });
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
  }: DeleteListItemByValueOptions): Promise<ListsItemsSchema[]> => {
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

  // TODO: Rename this to exportListItemsToStream
  public writeListItemsToStream = ({
    stringToAppend,
    listId,
    stream,
  }: WriteListItemsToStreamOptions): void => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    writeListItemsToStream({
      listId,
      stream,
      dataClient,
      listsItemsIndex,
      stringToAppend,
    });
  };

  // TODO: Rename this to importListItemsToStream
  public writeLinesToBulkListItems = async ({
    type,
    listId,
    stream,
  }: WriteLinesToBulkListItemsOptions): Promise<void> => {
    const { dataClient, security, request } = this;
    const listsItemsIndex = this.getListItemIndex();
    const user = getUser({ security, request });
    return writeLinesToBulkListItems({
      listId,
      type,
      stream,
      dataClient,
      listsItemsIndex,
      user,
    });
  };

  public getListItemByValue = async ({
    listId,
    value,
    type,
  }: GetListItemByValueOptions): Promise<ListsItemsSchema | null> => {
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
    });
  };

  public updateListItem = async ({
    listId,
    value,
    type,
  }: UpdateListItemOptions): Promise<ListsItemsSchema | null> => {
    const { dataClient } = this;
    const listsItemsIndex = this.getListItemIndex();
    return updateListItem({
      listId,
      type,
      value,
      dataClient,
      listsItemsIndex,
    });
  };

  public updateList = async ({
    id,
    name,
    description,
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
  }: GetListItemsByValueOptions): Promise<ListsItemsSchema[]> => {
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
