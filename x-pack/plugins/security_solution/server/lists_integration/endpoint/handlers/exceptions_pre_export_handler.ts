/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreExportServerExtension } from '../../../../../lists/server';
import { TrustedAppValidator } from '../validators/trusted_app_validator';

type ValidatedReturnType = ExceptionsListPreExportServerExtension['callback'];
export const getExceptionsPreExportHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatedReturnType => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;

    if (!listId && id) {
      listId = (await exceptionListClient.getExceptionList(data))?.list_id ?? null;
    }

    if (!listId) {
      return data;
    }

    // Validate Trusted Applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreExport();
    }

    return data;
  };
};
