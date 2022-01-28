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
import { EventFilterValidator, TrustedAppValidator } from '../validators';

export const getExceptionsPreCreateItemHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreCreateItemServerExtension['callback'] => {
  return async function ({ data, context: { request } }): Promise<CreateExceptionListItemOptions> {
    // Validate trusted apps
    if (TrustedAppValidator.isTrustedApp(data)) {
      return new TrustedAppValidator(endpointAppContext, request).validatePreCreateItem(data);
    }

    // Validate event filter
    if (EventFilterValidator.isEventFilter(data)) {
      return new EventFilterValidator(endpointAppContext, request).validatePreCreateItem(data);
    }

    return data;
  };
};
