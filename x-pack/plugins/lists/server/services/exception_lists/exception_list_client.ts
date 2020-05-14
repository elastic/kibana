/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { ExceptionListSchema } from '../../../common/schemas';

import {
  ConstructorOptions,
  CreateExceptionListItemOptions,
  CreateExceptionListOptions,
  DeleteExceptionListOptions,
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
  }: GetExceptionListItemOptions): Promise<ExceptionListSchema | null> => {
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
    comment,
    description,
    entries,
    itemId,
    listId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: CreateExceptionListItemOptions): Promise<ExceptionListSchema> => {
    const { savedObjectsClient, user } = this;
    return createExceptionListItem({
      _tags,
      comment,
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
    comment,
    description,
    entries,
    id,
    itemId,
    meta,
    name,
    namespaceType,
    tags,
    type,
  }: UpdateExceptionListItemOptions): Promise<ExceptionListSchema | null> => {
    const { savedObjectsClient, user } = this;
    return updateExceptionListItem({
      _tags,
      comment,
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
}
