/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
} from '../../../common/schemas';

import {
  ConstructorOptions,
  CreateExceptionListItemOptions,
  CreateExceptionListOptions,
  DeleteExceptionListItemOptions,
  DeleteExceptionListOptions,
  FindExceptionListItemOptions,
  FindExceptionListOptions,
  GetExceptionListItemOptions,
  GetExceptionListOptions,
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
}
