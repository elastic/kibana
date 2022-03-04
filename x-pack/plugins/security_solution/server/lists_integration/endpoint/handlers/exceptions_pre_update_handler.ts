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
import { ExceptionItemLikeOptions } from '../types';
import {
  EventFilterValidator,
  TrustedAppValidator,
  HostIsolationExceptionsValidator,
} from '../validators';

type ValidatorCallback = ExceptionsListPreUpdateItemServerExtension['callback'];
export const getExceptionsPreUpdateItemHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatorCallback => {
  return async function ({
    data,
    context: { request, exceptionListClient },
  }): Promise<UpdateExceptionListItemOptions> {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const currentSavedItem = await exceptionListClient.getExceptionListItem({
      id: data.id,
      itemId: data.itemId,
      namespaceType: data.namespaceType,
    });

    // We don't want to `throw` here because we don't know for sure that the item is one we care about.
    // So we just return the data and the Lists plugin will likely error out because it can't find the item
    if (!currentSavedItem) {
      return data;
    }

    const listId = currentSavedItem.list_id;

    // Validate Trusted Applications
    if (TrustedAppValidator.isTrustedApp({ listId })) {
      const trustedAppValidator = new TrustedAppValidator(endpointAppContextService, request);
      const validatedItem = await trustedAppValidator.validatePreUpdateItem(data, currentSavedItem);
      trustedAppValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'TRUSTED_APP_BY_POLICY'
      );
      return validatedItem;
    }

    // Validate Event Filters
    if (EventFilterValidator.isEventFilter({ listId })) {
      const eventFilterValidator = new EventFilterValidator(endpointAppContextService, request);
      const validatedItem = await eventFilterValidator.validatePreUpdateItem(
        data,
        currentSavedItem
      );
      eventFilterValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'EVENT_FILTERS_BY_POLICY'
      );
      return validatedItem;
    }

    // Validate host isolation
    if (HostIsolationExceptionsValidator.isHostIsolationException({ listId })) {
      const hostIsolationExceptionValidator = new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      );
      const validatedItem = await hostIsolationExceptionValidator.validatePreUpdateItem(data);
      hostIsolationExceptionValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'HOST_ISOLATION_EXCEPTION_BY_POLICY'
      );
      hostIsolationExceptionValidator.notifyFeatureUsage(
        data as ExceptionItemLikeOptions,
        'HOST_ISOLATION_EXCEPTION'
      );
      return validatedItem;
    }

    return data;
  };
};
