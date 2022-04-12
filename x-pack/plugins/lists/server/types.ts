/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  IContextProvider,
  IRouter,
  CustomRequestHandlerContext,
  SavedObjectsClientContract,
} from 'kibana/server';

import type { SecurityPluginStart } from '../../security/server';
import type { SpacesPluginStart } from '../../spaces/server';

import { ListClient } from './services/lists/list_client';
import { ExceptionListClient } from './services/exception_lists/exception_list_client';
import type {
  ExtensionPointStorageClientInterface,
  ListsServerExtensionRegistrar,
} from './services/extension_points';

export type ContextProvider = IContextProvider<ListsRequestHandlerContext, 'lists'>;
export type ListsPluginStart = void;

export interface PluginsStart {
  security: SecurityPluginStart | undefined | null;
  spaces: SpacesPluginStart | undefined | null;
}

export type GetListClientType = (
  esClient: ElasticsearchClient,
  spaceId: string,
  user: string
) => ListClient;

export type GetExceptionListClientType = (
  savedObjectsClient: SavedObjectsClientContract,
  user: string,
  /** Default is `true` - processing of server extension points are always on by default */
  enableServerExtensionPoints?: boolean
) => ExceptionListClient;

export interface ListPluginSetup {
  getExceptionListClient: GetExceptionListClientType;
  getListClient: GetListClientType;
  registerExtension: ListsServerExtensionRegistrar;
}

/**
 * @public
 */
export interface ListsApiRequestHandlerContext {
  getListClient: () => ListClient;
  getExceptionListClient: () => ExceptionListClient;
  getExtensionPointClient: () => ExtensionPointStorageClientInterface;
}

/**
 * @internal
 */
export type ListsRequestHandlerContext = CustomRequestHandlerContext<{
  lists?: ListsApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type ListsPluginRouter = IRouter<ListsRequestHandlerContext>;
/**
 * @internal
 */
export type ContextProviderReturn = Promise<ListsApiRequestHandlerContext>;

export type {
  ExtensionPoint,
  ExceptionsListPreUpdateItemServerExtension,
  ExceptionsListPreCreateItemServerExtension,
  ExceptionsListPreGetOneItemServerExtension,
  ExceptionsListPreImportServerExtension,
  ExceptionsListPreSummaryServerExtension,
  ExceptionsListPreExportServerExtension,
  ExceptionsListPreMultiListFindServerExtension,
  ExceptionsListPreSingleListFindServerExtension,
  ExceptionsListPreDeleteItemServerExtension,
  ListsServerExtensionRegistrar,
} from './services/extension_points';
