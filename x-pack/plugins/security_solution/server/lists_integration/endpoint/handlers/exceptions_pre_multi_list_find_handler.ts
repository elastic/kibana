/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionsListPreMultiListFindServerExtension } from '@kbn/lists-plugin/server';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  TrustedAppValidator,
  HostIsolationExceptionsValidator,
  EventFilterValidator,
  BlocklistValidator,
} from '../validators';

type ValidatorCallback = ExceptionsListPreMultiListFindServerExtension['callback'];
export const getExceptionsPreMultiListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatorCallback => {
  return async function ({ data, context: { request } }) {
    if (!data.namespaceType.includes('agnostic')) {
      return data;
    }

    // validate Trusted application
    if (data.listId.some((id) => TrustedAppValidator.isTrustedApp({ listId: id }))) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreMultiListFind();
      return data;
    }

    // Validate Host Isolation Exceptions
    if (
      data.listId.some((listId) =>
        HostIsolationExceptionsValidator.isHostIsolationException({ listId })
      )
    ) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
      return data;
    }

    // Event Filters Exceptions
    if (data.listId.some((listId) => EventFilterValidator.isEventFilter({ listId }))) {
      await new EventFilterValidator(endpointAppContextService, request).validatePreMultiListFind();
      return data;
    }

    // validate Blocklist
    if (data.listId.some((id) => BlocklistValidator.isBlocklist({ listId: id }))) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreMultiListFind();
      return data;
    }

    return data;
  };
};
