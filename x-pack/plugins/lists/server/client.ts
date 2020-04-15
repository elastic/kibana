/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, KibanaRequest, ScopedClusterClient } from 'src/core/server';

import { SpacesServiceSetup } from '../../spaces/server';
import { ListsSchema, Type } from '../common/schemas';

import { ConfigType } from './config';
import { getListIndex, getList, createList } from './lists';

interface ConstructorOptions {
  logger: Logger;
  config: ConfigType;
  dataClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  request: KibanaRequest;
  spaces: SpacesServiceSetup | undefined | null;
}

export class ListsClient {
  private readonly spaces: SpacesServiceSetup | undefined | null;
  private readonly config: ConfigType;
  private readonly logger: Logger;
  private readonly dataClient: Pick<
    ScopedClusterClient,
    'callAsCurrentUser' | 'callAsInternalUser'
  >;
  private readonly request: KibanaRequest;

  constructor({ request, spaces, config, logger, dataClient }: ConstructorOptions) {
    this.request = request;
    this.spaces = spaces;
    this.config = config;
    this.logger = logger;
    this.dataClient = dataClient;
  }

  public getListIndex = (): string => {
    const {
      spaces,
      request,
      config: { listsIndex: listsIndexName },
    } = this;
    return getListIndex({ spaces, request, listsIndexName });
  };

  public getList = async ({ id }: { id: string }): Promise<ListsSchema | null> => {
    const { dataClient } = this;
    const listsIndex = this.getListIndex();
    return getList({ id, clusterClient: dataClient, listsIndex });
  };

  public createList = async ({
    id,
    name,
    description,
    type,
  }: {
    id: string | undefined | null;
    name: string;
    description: string;
    type: Type;
  }): Promise<ListsSchema> => {
    const { dataClient } = this;
    const listsIndex = this.getListIndex();
    return createList({ name, description, id, clusterClient: dataClient, listsIndex, type });
  };
}
