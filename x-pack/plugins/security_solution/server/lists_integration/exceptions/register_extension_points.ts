/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../lib/exceptions/logic/service';
import { getExceptionsPreCreateItemHandler } from './handlers/exceptions_pre_create_item_handler';
import { getExceptionsPreUpdateItemHandler } from './handlers/exceptions_pre_update_item_handler';
import { getExceptionsPreGetOneHandler } from './handlers/exceptions_pre_get_item_handler';
import { getExceptionsPreSummaryHandler } from './handlers/exceptions_pre_summary_handler';
import { getExceptionsPreDeleteItemHandler } from './handlers/exceptions_pre_delete_item_handler';
import { getExceptionsPreExportHandler } from './handlers/exceptions_pre_export_handler';
import { getExceptionsPreFindMultiItemsHandler } from './handlers/exceptions_pre_find_multi_items_handler';
import { getExceptionsPreFindSingleItemHandler } from './handlers/exceptions_pre_find_single_item_handler';
import { getExceptionsPreImportHandler } from './handlers/exceptions_pre_import_handler';
import { getExceptionsPreCreateListHandler } from './handlers/exceptions_pre_create_list_handler';
import { getExceptionsPreDeleteListHandler } from './handlers/exceptions_pre_delete_list_handler';
import { getExceptionsPreUpdateListHandler } from './handlers/exceptions_pre_update_list_handler';

export const registerListsPluginExtensionPoints = (
  registerListsExtensionPoint: ListsServerExtensionRegistrar,
  exceptionsService: ExceptionsService
): void => {
  // PRE-CREATE list handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreCreateList',
    callback: getExceptionsPreCreateListHandler(exceptionsService),
  });

  // PRE-DELETE list handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreDeleteList',
    callback: getExceptionsPreDeleteListHandler(exceptionsService),
  });

  // PRE-UPDATE list handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreUpdateList',
    callback: getExceptionsPreUpdateListHandler(exceptionsService),
  });

  // PRE-CREATE handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreCreateItem',
    callback: getExceptionsPreCreateItemHandler(exceptionsService),
  });

  // PRE-UPDATE handler
  registerListsExtensionPoint({
    type: 'exceptionsListPreUpdateItem',
    callback: getExceptionsPreUpdateItemHandler(exceptionsService),
  });

  // PRE-GET ONE
  registerListsExtensionPoint({
    type: 'exceptionsListPreGetOneItem',
    callback: getExceptionsPreGetOneHandler(exceptionsService),
  });

  // PRE-SUMMARY
  registerListsExtensionPoint({
    type: 'exceptionsListPreSummary',
    callback: getExceptionsPreSummaryHandler(exceptionsService),
  });

  // PRE-DELETE item
  registerListsExtensionPoint({
    type: 'exceptionsListPreDeleteItem',
    callback: getExceptionsPreDeleteItemHandler(exceptionsService),
  });

  // PRE-EXPORT
  registerListsExtensionPoint({
    type: 'exceptionsListPreExport',
    callback: getExceptionsPreExportHandler(exceptionsService),
  });

  // PRE-MULTI-LIST-FIND
  registerListsExtensionPoint({
    type: 'exceptionsListPreMultiListFind',
    callback: getExceptionsPreFindMultiItemsHandler(exceptionsService),
  });

  // PRE-SINGLE-LIST-FIND
  registerListsExtensionPoint({
    type: 'exceptionsListPreSingleListFind',
    callback: getExceptionsPreFindSingleItemHandler(exceptionsService),
  });

  // PRE-IMPORT
  registerListsExtensionPoint({
    type: 'exceptionsListPreImport',
    callback: getExceptionsPreImportHandler(exceptionsService),
  });
};
