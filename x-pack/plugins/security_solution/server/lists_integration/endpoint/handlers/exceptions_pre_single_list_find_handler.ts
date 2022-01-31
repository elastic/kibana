/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreSingleListFindServerExtension } from '../../../../../lists/server';
import { TrustedAppValidator } from '../validators/trusted_app_validator';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';

type ValidatedReturnType = ExceptionsListPreSingleListFindServerExtension['callback'];
export const getExceptionsPreSingleListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatedReturnType => {
  return async function ({ data, context: { request } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    // Validate Host Isolation Exceptions
    if (TrustedAppValidator.isTrustedApp({ listId: data.listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreSingleListFind();
      return data;
    }
    if (HostIsolationExceptionsValidator.isHostIsolationException(data.listId)) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
      return data;
    }

    return data;
  };
};
