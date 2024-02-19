/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListOptions,
  ExceptionsListPreCreateListServerExtension,
} from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreCreateListServerExtension['callback'];
export const getExceptionsPreCreateListHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request } }): Promise<CreateExceptionListOptions> {
    // validate access privileges
    if (ExceptionsValidator.isSiemException(data)) {
      const exceptionValidator = new ExceptionsValidator(exceptionsService, request);
      const validatedItem = await exceptionValidator.validatePreCreateList(data);
      return validatedItem;
    }

    return data;
  };
};
