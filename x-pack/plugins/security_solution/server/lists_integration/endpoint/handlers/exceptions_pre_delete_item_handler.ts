/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';
import { ExceptionsListPreDeleteItemServerExtension } from '../../../../../lists/server';
import { EventFilterValidator } from '../validators';

export const getExceptionsPreDeleteItemHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreDeleteItemServerExtension['callback'] => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const exceptionItem: ExceptionListItemSchema | null =
      await exceptionListClient.getExceptionListItem({
        id: data.id,
        itemId: data.itemId,
        namespaceType: data.namespaceType,
      });

    if (!exceptionItem) {
      return data;
    }

    const { list_id: listId } = exceptionItem;

    // Host Isolation Exception
    if (HostIsolationExceptionsValidator.isHostIsolationException(listId)) {
      await new HostIsolationExceptionsValidator(
        endpointAppContext,
        request
      ).validatePreDeleteItem();
      return data;
    }

    // Event Filter validation
    if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(endpointAppContext, request).validatePreDeleteItem();
      return data;
    }

    return data;
  };
};
