/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemOptions,
  ExceptionsListPreCreateItemServerExtension,
} from '../../../../../lists/server';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  EventFilterValidator,
  TrustedAppValidator,
  HostIsolationExceptionsValidator,
  BlocklistValidator,
} from '../validators';

type ValidatorCallback = ExceptionsListPreCreateItemServerExtension['callback'];
export const getExceptionsPreCreateItemHandler = (
  endpointAppContext: EndpointAppContextService
): ValidatorCallback => {
  return async function ({ data, context: { request } }): Promise<CreateExceptionListItemOptions> {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    // Validate trusted apps
    if (TrustedAppValidator.isTrustedApp(data)) {
      const trustedAppValidator = new TrustedAppValidator(endpointAppContext, request);
      const validatedItem = await trustedAppValidator.validatePreCreateItem(data);
      trustedAppValidator.notifyFeatureUsage(data, 'TRUSTED_APP_BY_POLICY');
      return validatedItem;
    }

    // Validate event filter
    if (EventFilterValidator.isEventFilter(data)) {
      const eventFilterValidator = new EventFilterValidator(endpointAppContext, request);
      const validatedItem = await eventFilterValidator.validatePreCreateItem(data);
      eventFilterValidator.notifyFeatureUsage(data, 'EVENT_FILTERS_BY_POLICY');
      return validatedItem;
    }

    // Validate host isolation
    if (HostIsolationExceptionsValidator.isHostIsolationException(data)) {
      const hostIsolationExceptionsValidator = new HostIsolationExceptionsValidator(
        endpointAppContext,
        request
      );
      const validatedItem = await hostIsolationExceptionsValidator.validatePreCreateItem(data);
      hostIsolationExceptionsValidator.notifyFeatureUsage(
        data,
        'HOST_ISOLATION_EXCEPTION_BY_POLICY'
      );
      hostIsolationExceptionsValidator.notifyFeatureUsage(data, 'HOST_ISOLATION_EXCEPTION');
      return validatedItem;
    }

    // Validate blocklists
    if (BlocklistValidator.isBlocklist(data)) {
      const blocklistValidator = new BlocklistValidator(endpointAppContext, request);
      const validatedItem = await blocklistValidator.validatePreCreateItem(data);
      blocklistValidator.notifyFeatureUsage(data, 'BLOCKLIST_BY_POLICY');
      return validatedItem;
    }

    return data;
  };
};
