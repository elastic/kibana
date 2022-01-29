/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreExportServerExtension } from '../../../../../lists/server';
import { EventFilterValidator } from '../validators';

export const getExceptionsPreExportHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreExportServerExtension['callback'] => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;

    if (!listId && id) {
      listId = (await exceptionListClient.getExceptionList(data))?.list_id ?? null;
    }

    if (!listId) {
      return data;
    }

    // Event Filter validations
    if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(endpointAppContextService, request).validatePreExport();
      return data;
    }

    return data;
  };
};
