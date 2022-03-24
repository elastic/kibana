/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreSingleListFindServerExtension } from '../../../../../lists/server';
import {
  TrustedAppValidator,
  HostIsolationExceptionsValidator,
  EventFilterValidator,
  BlocklistValidator,
} from '../validators';

type ValidatorCallback = ExceptionsListPreSingleListFindServerExtension['callback'];
export const getExceptionsPreSingleListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatorCallback => {
  return async function ({ data, context: { request } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const { listId } = data;

    // Validate Trusted applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreSingleListFind();
      return data;
    }

    // Host Isolation Exceptions
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
      return data;
    }

    // Event Filters Exceptions
    if (EventFilterValidator.isEventFilter({ listId })) {
      await new EventFilterValidator(
        endpointAppContextService,
        request
      ).validatePreSingleListFind();
      return data;
    }

    // Validate Blocklists
    if (BlocklistValidator.isBlocklist({ listId })) {
      await new BlocklistValidator(endpointAppContextService, request).validatePreSingleListFind();
      return data;
    }

    return data;
  };
};
