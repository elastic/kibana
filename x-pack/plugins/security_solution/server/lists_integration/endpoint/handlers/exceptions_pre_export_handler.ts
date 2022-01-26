/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreExportServerExtension } from '../../../../../lists/server';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';

export const getExceptionsPreExportHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreExportServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;

    if (!listId && id) {
      listId =
        (await endpointAppContextService.getExceptionListsClient().getExceptionList(data))
          ?.list_id ?? null;
    }

    if (!listId) {
      return data;
    }

    // Host Isolation Exceptions validations
    if (HostIsolationExceptionsValidator.isHostIsolationException({ list_id: listId })) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreExport();
    }

    return data;
  };
};
