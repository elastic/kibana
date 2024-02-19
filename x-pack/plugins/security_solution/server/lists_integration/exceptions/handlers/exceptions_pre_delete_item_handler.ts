/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsListPreDeleteItemServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreDeleteItemServerExtension['callback'];
export const getExceptionsPreDeleteItemHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    const exceptionItem: ExceptionListItemSchema | null =
      await exceptionListClient.getExceptionListItem({
        id: data.id,
        itemId: data.itemId,
        namespaceType: data.namespaceType,
      });

    if (!exceptionItem) {
      return data;
    }

    const { list_id: listId } = exceptionItem;

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      await new ExceptionsValidator(exceptionsService, request).validatePreDeleteItem();
      return data;
    }

    return data;
  };
};
