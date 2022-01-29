/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreMultiListFindServerExtension } from '../../../../../lists/server';
import { EventFilterValidator } from '../validators';

export const getExceptionsPreMultiListFindHandler = (
  endpointAppContext: EndpointAppContextService
): ExceptionsListPreMultiListFindServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    if (!data.namespaceType.includes('agnostic')) {
      return data;
    }

    // Event Filters Exceptions
    if (data.listId.some((listId) => EventFilterValidator.isEventFilter({ listId }))) {
      await new EventFilterValidator(endpointAppContext, request).validatePreMultiListFind();
      return data;
    }

    return data;
  };
};
