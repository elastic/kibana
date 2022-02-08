/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { getExceptionsPreCreateItemHandler } from './handlers/exceptions_pre_create_handler';
import { getExceptionsPreUpdateItemHandler } from './handlers/exceptions_pre_update_handler';
import type { ListsServerExtensionRegistrar } from '../../../../lists/server';
import { getExceptionsPreGetOneHandler } from './handlers/exceptions_pre_get_one_handler';
import { getExceptionsPreSummaryHandler } from './handlers/exceptions_pre_summary_handler';
import { getExceptionsPreDeleteItemHandler } from './handlers/exceptions_pre_delete_item_handler';
import { getExceptionsPreExportHandler } from './handlers/exceptions_pre_export_handler';
import { getExceptionsPreMultiListFindHandler } from './handlers/exceptions_pre_multi_list_find_handler';
import { getExceptionsPreSingleListFindHandler } from './handlers/exceptions_pre_single_list_find_handler';
import { getExceptionsPreImportHandler } from './handlers/exceptions_pre_import_handler';

export const registerListsPluginEndpointExtensionPoints = (
  registerListsExtensionPoint: ListsServerExtensionRegistrar,
  endpointAppContextService: EndpointAppContextService
): void => {
  // PRE-CREATE handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreCreateItem',
    callback: getExceptionsPreCreateItemHandler(endpointAppContextService),
  });

  // PRE-UPDATE handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreUpdateItem',
    callback: getExceptionsPreUpdateItemHandler(endpointAppContextService),
  });

  // PRE-GET ONE
  registerListsExtensionPoint({
    type: 'exceptionsListPreGetOneItem',
    callback: getExceptionsPreGetOneHandler(endpointAppContextService),
  });

  // PRE-SUMMARY
  registerListsExtensionPoint({
    type: 'exceptionsListPreSummary',
    callback: getExceptionsPreSummaryHandler(endpointAppContextService),
  });

  // PRE-DELETE item
  registerListsExtensionPoint({
    type: 'exceptionsListPreDeleteItem',
    callback: getExceptionsPreDeleteItemHandler(endpointAppContextService),
  });

  // PRE-EXPORT
  registerListsExtensionPoint({
    type: 'exceptionsListPreExport',
    callback: getExceptionsPreExportHandler(endpointAppContextService),
  });

  // PRE-MULTI-LIST-FIND
  registerListsExtensionPoint({
    type: 'exceptionsListPreMultiListFind',
    callback: getExceptionsPreMultiListFindHandler(endpointAppContextService),
  });

  // PRE-SINGLE-LIST-FIND
  registerListsExtensionPoint({
    type: 'exceptionsListPreSingleListFind',
    callback: getExceptionsPreSingleListFindHandler(endpointAppContextService),
  });

  // PRE-IMPORT
  registerListsExtensionPoint({
    type: 'exceptionsListPreImport',
    callback: getExceptionsPreImportHandler(),
  });
};
