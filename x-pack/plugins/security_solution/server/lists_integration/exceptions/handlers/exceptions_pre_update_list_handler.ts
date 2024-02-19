/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionsListPreUpdateListServerExtension,
  UpdateExceptionListOptions,
} from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreUpdateListServerExtension['callback'];
export const getExceptionsPreUpdateListHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({
    data,
    context: { request, exceptionListClient },
  }): Promise<UpdateExceptionListOptions> {
    const currentSavedList = await exceptionListClient.getExceptionList({
      id: data.id,
      listId: data.listId,
      namespaceType: data.namespaceType,
    });

    // We don't want to `throw` here because we don't know for sure that the list is one we care about.
    // So we just return the data and the Lists plugin will likely error out because it can't find the list
    if (!currentSavedList) {
      return data;
    }

    const listId = currentSavedList.list_id;

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      const exceptionValidator = new ExceptionsValidator(exceptionsService, request);
      const validatedItem = await exceptionValidator.validatePreUpdateList(data);
      return validatedItem;
    }

    return data;
  };
};
