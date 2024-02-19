/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreSummaryServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreSummaryServerExtension['callback'];
export const getExceptionsPreSummaryHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    const { listId: maybeListId, id } = data;
    let listId: string | null | undefined = maybeListId;

    if (!listId && id) {
      listId = (await exceptionListClient.getExceptionList(data))?.list_id ?? null;
    }

    if (!listId) {
      return data;
    }

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      await new ExceptionsValidator(exceptionsService, request).validatePreGetListSummary();
      return data;
    }

    return data;
  };
};
