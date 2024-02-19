/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionsListPreImportServerExtension } from '@kbn/lists-plugin/server';
import type { ExceptionsService } from '../../../lib/exceptions/logic/service';
import { ExceptionsValidator } from '../validators';

type ValidatorCallback = ExceptionsListPreImportServerExtension['callback'];
export const getExceptionsPreImportHandler = (
  exceptionsService: ExceptionsService
): ValidatorCallback => {
  return async ({ data, context: { request } }) => {
    const hasSiemArtifactListOrListItems = [...data.lists, ...data.items].some((item) => {
      if ('list_id' in item) {
        return ExceptionsValidator.isSiemException({ listId: item.list_id });
      }
      return false;
    });

    // validate access privileges
    if (hasSiemArtifactListOrListItems) {
      await new ExceptionsValidator(exceptionsService, request).validatePreImport();
      return data;
    }

    return data;
  };
};
