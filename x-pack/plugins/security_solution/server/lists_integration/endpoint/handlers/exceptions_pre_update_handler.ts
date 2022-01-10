/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionsListPreUpdateItemServerExtension,
  UpdateExceptionListItemOptions,
} from '../../../../../lists/server';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { TrustedAppValidator } from '../validators';

export const getExceptionsPreUpdateItemHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreUpdateItemServerExtension['callback'] => {
  return async function (
    data: UpdateExceptionListItemOptions
  ): Promise<UpdateExceptionListItemOptions> {
    // Validate trusted apps
    if (TrustedAppValidator.isTrustedApp(data)) {
      return new TrustedAppValidator(endpointAppContext, this.request).validatePreUpdateItem(data);
    }

    return data;
  };
};
