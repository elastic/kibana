/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ExceptionListItemSchema, CreateExceptionListItemSchema } from '../../../../shared_imports';
import { ServerApiError } from '../../../../common/types';

export const getCreationSuccessMessage = (
  entry: CreateExceptionListItemSchema | ExceptionListItemSchema | undefined
) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.successToastTitle', {
    defaultMessage: '"{name}" has been added to the event exceptions list.',
    values: { name: entry?.name },
  });
};

export const getCreationErrorMessage = (creationError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle', {
    defaultMessage: 'There was an error creating the new exception: "{error}"',
    values: { error: creationError.message },
  });
};
