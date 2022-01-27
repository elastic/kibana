/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreDeleteItemServerExtension } from '../../../../../lists/server';
import { TrustedAppValidator } from '../validators/trusted_app_validator';

type ValidatedReturnType = ExceptionsListPreDeleteItemServerExtension['callback'];
export const getExceptionsPreDeleteItemHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatedReturnType => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const exceptionItem: ExceptionListItemSchema | null =
      await exceptionListClient.getExceptionListItem({
        id: data.id,
        itemId: data.itemId,
        namespaceType: data.namespaceType,
      });

    if (!exceptionItem) {
      return data;
    }

    // Validate Trusted Applications
    if (TrustedAppValidator.isTrustedApp({ listId: exceptionItem.list_id })) {
      const trustedAppValidatorInstance = new TrustedAppValidator(
        endpointAppContextService,
        request
      );

      if (data.itemId) {
        await trustedAppValidatorInstance.validatePreDeleteItemById();
      } else {
        await trustedAppValidatorInstance.validatePreDeleteItem();
      }
      return data;
    }

    return data;
  };
};
