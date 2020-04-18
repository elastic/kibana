/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScopedClusterClient, IContextProvider, RequestHandler } from 'kibana/server';

import { SpacesPluginSetup } from '../../spaces/server';
import { SecurityPluginSetup } from '../../security/server';

import { ListsClient } from './services/lists/client';

export type DataClient = Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
export type ContextProvider = IContextProvider<RequestHandler<unknown, unknown, unknown>, 'lists'>;

export interface PluginsSetup {
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup | undefined | null;
}

export type ContextProviderReturn = Promise<{ getListsClient: () => ListsClient }>;
declare module 'src/core/server' {
  interface RequestHandlerContext {
    lists?: {
      getListsClient: () => ListsClient;
    };
  }
}
