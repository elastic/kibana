/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

import { ConfigSchema } from './config';
import { ListPlugin } from './plugin';

// exporting these since its required at top level in siem plugin
export { ListClient } from './services/lists/list_client';
export type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from './services/exception_lists/exception_list_client_types';
export { ExceptionListClient } from './services/exception_lists/exception_list_client';
export type {
  ListPluginSetup,
  ListsApiRequestHandlerContext,
  ListsServerExtensionRegistrar,
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
} from './types';
export type { ExportExceptionListAndItemsReturn } from './services/exception_lists/export_exception_list_and_items';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};

export { ErrorWithStatusCode as ListsErrorWithStatusCode } from './error_with_status_code';

export const plugin = (initializerContext: PluginInitializerContext): ListPlugin =>
  new ListPlugin(initializerContext);
