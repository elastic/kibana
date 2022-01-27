/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreGetOneItemServerExtension } from '../../../../../lists/server';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';

export const getExceptionsPreGetOneHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreGetOneItemServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    // / FIXME: remove once this PR is merged: https://github.com/elastic/kibana/pull/123885
    return data;

    if (data.namespaceType !== 'agnostic') {
      return data;
    }

    const exceptionItem: ExceptionListItemSchema | null = await endpointAppContextService
      .getExceptionListsClient()
      .getExceptionListItem({
        id: data.id,
        itemId: data.itemId,
        namespaceType: data.namespaceType,
      });

    if (!exceptionItem) {
      return data;
    }

    // validate Host Isolation Exception
    if (HostIsolationExceptionsValidator.isHostIsolationException(exceptionItem.list_id)) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreGetOneItem();

      return data;
    }

    return data;
  };
};
