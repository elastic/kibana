/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreMultiListFindServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreMultiListFindServerExtension['callback'];
export const getExceptionsPreFindMultiItemsHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async function ({ data, context: { request } }) {
    // validate access privileges
    if (data.listId.some((id) => ExceptionsValidator.isSiemException({ listId: id }))) {
      await new ExceptionsValidator(exceptionsService, request).validatePreFindMultiItems();
      return data;
    }

    return data;
  };
};
