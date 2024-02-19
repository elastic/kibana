/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreSingleListFindServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreSingleListFindServerExtension['callback'];
export const getExceptionsPreFindSingleItemHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request } }) {
    const { listId } = data;

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      await new ExceptionsValidator(exceptionsService, request).validatePreFindSingleItem();
      return data;
    }

    return data;
  };
};
