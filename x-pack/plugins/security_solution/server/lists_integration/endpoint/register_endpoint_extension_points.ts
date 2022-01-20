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
};
