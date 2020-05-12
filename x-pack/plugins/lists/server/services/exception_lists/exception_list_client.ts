/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, SavedObjectsClientContract } from 'kibana/server';

import { ExceptionListSchema } from '../../../common/schemas';
import { ConfigType } from '../../config';

import {
  ConstructorOptions,
  CreateExceptionListOptions,
  GetExceptionListOptions,
} from './exception_list_client_types';
import { getExceptionList } from './get_exception_list';
import { createExceptionList } from './create_exception_list';

export class ExceptionListClient {
  // TODO: Delete this if it is not being used
  private readonly spaceId: string;
  private readonly user: string;
  // TODO: Delete this if it is not being used
  private readonly config: ConfigType;
  // TODO: Delete this if it is not being used
  private readonly callCluster: APICaller;

  private readonly savedObjectsClient: SavedObjectsClientContract;

  constructor({ spaceId, user, config, callCluster, savedObjectsClient }: ConstructorOptions) {
    this.spaceId = spaceId;
    this.user = user;
    this.config = config;
    this.callCluster = callCluster;
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
}
