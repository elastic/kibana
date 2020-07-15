/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { ENDPOINT_LIST_ID } from '../../../common/constants';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
} from '../../../common/schemas';

import {
  ConstructorOptions,
  CreateEndpointListItemOptions,
  CreateExceptionListItemOptions,
  CreateExceptionListOptions,
  DeleteEndpointListItemOptions,
  DeleteExceptionListItemOptions,
  DeleteExceptionListOptions,
  FindEndpointListItemOptions,
  FindExceptionListItemOptions,
  FindExceptionListOptions,
  FindExceptionListsItemOptions,
  GetEndpointListItemOptions,
  GetExceptionListItemOptions,
  GetExceptionListOptions,
  UpdateEndpointListItemOptions,
  UpdateExceptionListItemOptions,
  UpdateExceptionListOptions,
} from './exception_list_client_types';
import { getExceptionList } from './get_exception_list';
import { createExceptionList } from './create_exception_list';
import { getExceptionListItem } from './get_exception_list_item';
import { createExceptionListItem } from './create_exception_list_item';
import { updateExceptionList } from './update_exception_list';
import { updateExceptionListItem } from './update_exception_list_item';
import { deleteExceptionList } from './delete_exception_list';
import { deleteExceptionListItem } from './delete_exception_list_item';
import { findExceptionListItem } from './find_exception_list_item';
import { findExceptionList } from './find_exception_list';
import { findExceptionListsItem } from './find_exception_list_items';
import { createEndpointList } from './create_endpoint_list';

export class ExceptionListClient {
  private readonly user: string;

  private readonly savedObjectsClient: SavedObjectsClientContract;

  constructor({ user, savedObjectsClient }: ConstructorOptions) {
    this.user = user;
    this.savedObjectsClient = savedObjectsClient;
  }

  public getExceptionList = async ({
    listId,
    id,
    namespaceType,
  }: GetExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient } = this;
    return getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  };

  public getExceptionListItem = async ({
    itemId,
    id,
    namespaceType,
  }: GetExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return getExceptionListItem({ id, itemId, namespaceType, savedObjectsClient });
  };

  /**
   * This creates an agnostic space endpoint list if it does not exist. This tries to be
   * as fast as possible by ignoring conflict errors and not returning the contents of the
   * list if it already exists.
   * @returns ExceptionListSchema if it created the endpoint list, otherwise null if it already exists
   */
  public createEndpointList = async (): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return createEndpointList({
      savedObjectsClient,
      user,
    });
  };

  /**
   * This is the same as "createListItem" except it applies specifically to the agnostic endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the agnostic endpoint
   * being there and existing before the item is inserted into the agnostic endpoint list.
   */
  public createEndpointListItem = async ({
    _tags,
    comments,
    description,
    entries,
    itemId,
    meta,
    name,
    tags,
    type,
  }: CreateEndpointListItemOptions): Promise<ExceptionListItemSchema> => {
    const { savedObjectsClient, user } = this;
    await this.createEndpointList();
    return createExceptionListItem({
      _tags,
      comments,
      description,
      entries,
      itemId,
      listId: ENDPOINT_LIST_ID,
      meta,
      name,
      namespaceType: 'agnostic',
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  /**
   * This is the same as "updateListItem" except it applies specifically to the endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the endpoint
   * being there if it did not exist before. If the list did not exist before, then creating it here will still cause a
   * return of null but at least the list exists again.
   */
  public updateEndpointListItem = async ({
    _tags,
    comments,
    description,
    entries,
    id,
    itemId,
    meta,
    name,
    tags,
    type,
  }: UpdateEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient, user } = this;
    await this.createEndpointList();
    return updateExceptionListItem({
      _tags,
      comments,
      description,
      entries,
      id,
      itemId,
      meta,
      name,
      namespaceType: 'agnostic',
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  /**
   * This is the same as "getExceptionListItem" except it applies specifically to the endpoint list.
   */
  public getEndpointListItem = async ({
    itemId,
    id,
  }: GetEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return getExceptionListItem({ id, itemId, namespaceType: 'agnostic', savedObjectsClient });
  };

  public createExceptionList = async ({
    _tags,
    description,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
    const { savedObjectsClient, user } = this;
    return createExceptionList({
      _tags,
      description,
      listId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  public updateExceptionList = async ({
    _tags,
    id,
    description,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: UpdateExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return updateExceptionList({
      _tags,
      description,
      id,
      listId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  public deleteExceptionList = async ({
    id,
    listId,
    namespaceType,
  }: DeleteExceptionListOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient } = this;
    return deleteExceptionList({
      id,
      listId,
      namespaceType,
      savedObjectsClient,
    });
  };

  public createExceptionListItem = async ({
    _tags,
    comments,
    description,
    entries,
    itemId,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: CreateExceptionListItemOptions): Promise<ExceptionListItemSchema> => {
    const { savedObjectsClient, user } = this;
    return createExceptionListItem({
      _tags,
      comments,
      description,
      entries,
      itemId,
      listId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  public updateExceptionListItem = async ({
    _tags,
    comments,
    description,
    entries,
    id,
    itemId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: UpdateExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient, user } = this;
    return updateExceptionListItem({
      _tags,
      comments,
      description,
      entries,
      id,
      itemId,
      meta,
      name,
      namespaceType,
      savedObjectsClient,
      tags,
      type,
      user,
    });
  };

  public deleteExceptionListItem = async ({
    id,
    itemId,
    namespaceType,
  }: DeleteExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return deleteExceptionListItem({
      id,
      itemId,
      namespaceType,
      savedObjectsClient,
    });
  };

  /**
   * This is the same as "deleteExceptionListItem" except it applies specifically to the endpoint list.
   */
  public deleteEndpointListItem = async ({
    id,
    itemId,
  }: DeleteEndpointListItemOptions): Promise<ExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return deleteExceptionListItem({
      id,
      itemId,
      namespaceType: 'agnostic',
      savedObjectsClient,
    });
  };

  public findExceptionListItem = async ({
    listId,
    filter,
    perPage,
    page,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return findExceptionListItem({
      filter,
      listId,
      namespaceType,
      page,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  public findExceptionListsItem = async ({
    listId,
    filter,
    perPage,
    page,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListsItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    return findExceptionListsItem({
      filter,
      listId,
      namespaceType,
      page,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  public findExceptionList = async ({
    filter,
    perPage,
    page,
    sortField,
    sortOrder,
    namespaceType,
  }: FindExceptionListOptions): Promise<FoundExceptionListSchema> => {
    const { savedObjectsClient } = this;
    return findExceptionList({
      filter,
      namespaceType,
      page,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };

  /**
   * This is the same as "findExceptionList" except it applies specifically to the  endpoint list and will
   * auto-call the "createEndpointList" for you so that you have the best chance of the  endpoint
   * being there if it did not exist before. If the list did not exist before, then creating it here should give you
   * a good guarantee that you will get an empty record set rather than null. I keep the null as the return value in
   * the off chance that you still might somehow not get into a race condition where the  endpoint list does
   * not exist because someone deleted it in-between the initial create and then the find.
   */
  public findEndpointListItem = async ({
    filter,
    perPage,
    page,
    sortField,
    sortOrder,
  }: FindEndpointListItemOptions): Promise<FoundExceptionListItemSchema | null> => {
    const { savedObjectsClient } = this;
    await this.createEndpointList();
    return findExceptionListItem({
      filter,
      listId: ENDPOINT_LIST_ID,
      namespaceType: 'agnostic',
      page,
      perPage,
      savedObjectsClient,
      sortField,
      sortOrder,
    });
  };
}
