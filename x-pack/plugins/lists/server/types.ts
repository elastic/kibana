/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IContextProvider,
  LegacyAPICaller,
  RequestHandler,
  SavedObjectsClientContract,
} from 'kibana/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';

import { ListClient } from './services/lists/list_client';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';

export type ContextProvider = IContextProvider<RequestHandler<unknown, unknown, unknown>, 'lists'>;
export type ListsPluginStart = void;
export interface PluginsSetup {
  security: SecurityPluginSetup | undefined | null;
  spaces: SpacesPluginSetup | undefined | null;
}

export type GetListClientType = (
  dataClient: LegacyAPICaller,
  spaceId: string,
  user: string
) => ListClient;

export type GetExceptionListClientType = (
  savedObjectsClient: SavedObjectsClientContract,
  user: string
) => ExceptionListClient;

export interface ListPluginSetup {
  getExceptionListClient: GetExceptionListClientType;
  getListClient: GetListClientType;
}

export type ContextProviderReturn = Promise<{
  getListClient: () => ListClient;
  getExceptionListClient: () => ExceptionListClient;
}>;
declare module 'src/core/server' {
  interface RequestHandlerContext {
    lists?: {
      getExceptionListClient: () => ExceptionListClient;
      getListClient: () => ListClient;
    };
  }
}
