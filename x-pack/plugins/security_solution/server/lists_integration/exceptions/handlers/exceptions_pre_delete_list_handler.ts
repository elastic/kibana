/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsListPreDeleteListServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreDeleteListServerExtension['callback'];
export const getExceptionsPreDeleteListHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request, exceptionListClient } }) {
    const exceptionList: ExceptionListSchema | null = await exceptionListClient.getExceptionList({
      id: data.id,
      listId: data.listId,
      namespaceType: data.namespaceType,
    });

    if (!exceptionList) {
      return data;
    }

    const { list_id: listId } = exceptionList;

    // validate access privileges
    if (ExceptionsValidator.isSiemException({ listId })) {
      await new ExceptionsValidator(exceptionsService, request).validatePreDeleteList();
      return data;
    }

    return data;
  };
};
