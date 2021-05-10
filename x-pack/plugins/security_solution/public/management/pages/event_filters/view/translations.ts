/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '../../../../shared_imports';
import { ServerApiError } from '../../../../common/types';

export const getCreationSuccessMessage = (
  entry: CreateExceptionListItemSchema | UpdateExceptionListItemSchema | undefined
) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.creationSuccessToastTitle', {
    defaultMessage: '"{name}" has been added to the event exceptions list.',
    values: { name: entry?.name },
  });
};

export const getUpdateSuccessMessage = (
  entry: CreateExceptionListItemSchema | UpdateExceptionListItemSchema | undefined
) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.updateSuccessToastTitle', {
    defaultMessage: '"{name}" has been updated successfully.',
    values: { name: entry?.name },
  });
};

export const getCreationErrorMessage = (creationError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.create', {
    defaultMessage: 'There was an error creating the new exception: "{error}"',
    values: { error: creationError.message },
  });
};

export const getUpdateErrorMessage = (updateError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.update', {
    defaultMessage: 'There was an error updating the exception: "{error}"',
    values: { error: updateError.message },
  });
};

export const getGetErrorMessage = (getError: ServerApiError) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.failedToastTitle.get', {
    defaultMessage: 'Unable to edit trusted application: "{error}"',
    values: { error: getError.message },
  });
};
