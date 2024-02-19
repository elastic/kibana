/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionsListPreUpdateItemServerExtension,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreUpdateItemServerExtension['callback'];
export const getExceptionsPreUpdateItemHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({
    data,
    context: { request, exceptionListClient },
  }): Promise<UpdateExceptionListItemOptions> {
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

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      const exceptionValidator = new ExceptionsValidator(exceptionsService, request);
      const validatedItem = await exceptionValidator.validatePreUpdateItem(data);
      return validatedItem;
    }

    return data;
  };
};
