/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreSummaryServerExtension } from '../../../../../lists/server';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';

export const getExceptionsPreSummaryHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreSummaryServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;

    if (!listId && id) {
      listId =
        (await endpointAppContext.getExceptionListsClient().getExceptionList(data))?.list_id ??
        null;
    }

    if (!listId) {
      return data;
    }

    // Host Isolation Exceptions
    if (HostIsolationExceptionsValidator.isHostIsolationException(listId)) {
      await new HostIsolationExceptionsValidator(endpointAppContext, request).validatePreSummary();
    }

    return data;
  };
};
