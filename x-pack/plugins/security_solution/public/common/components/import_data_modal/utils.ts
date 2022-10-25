/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorToastOptions, Toast, ToastInput, ToastOptions } from '@kbn/core/public';

import * as i18n from './translations';

import type {
  ImportDataResponse,
  ImportResponseError,
  ImportRulesResponseError,
  ExceptionsImportError,
} from '../../../detection_engine/rule_management/logic';

export const formatError = (
  i18nFailedDetailedMessage: (message: string) => string,
  importResponse: ImportDataResponse,
  errors: Array<ImportRulesResponseError | ImportResponseError | ExceptionsImportError>
) => {
  const formattedErrors = errors.map((e) => i18nFailedDetailedMessage(e.error.message));
  const error: Error & { raw_network_error?: object } = new Error(formattedErrors.join('. '));
  error.stack = undefined;
  error.name = 'Network errors';
  error.raw_network_error = importResponse;

  return error;
};

export const showToasterMessage = ({
  importResponse,
  exceptionsIncluded,
  successMessage,
  errorMessage,
  errorMessageDetailed,
  addError,
  addSuccess,
}: {
  importResponse: ImportDataResponse;
  exceptionsIncluded: boolean;
  successMessage: (totalCount: number) => string;
  errorMessage: (totalCount: number) => string;
  errorMessageDetailed: (message: string) => string;
  addError: (error: unknown, options: ErrorToastOptions) => Toast;
  addSuccess: (toastOrTitle: ToastInput, options?: ToastOptions | undefined) => Toast;
}) => {
  // if import includes exceptions
  if (exceptionsIncluded) {
    // rules response actions
    if (importResponse.success && importResponse.success_count > 0) {
      addSuccess(successMessage(importResponse.success_count));
    }

    if (importResponse.errors.length > 0 && importResponse.rules_count) {
      const error = formatError(errorMessageDetailed, importResponse, importResponse.errors);
      addError(error, {
        title: errorMessage(importResponse.rules_count - importResponse.success_count),
      });
    }

    // exceptions response actions
    if (
      importResponse.exceptions_success &&
      importResponse.exceptions_success_count != null &&
      importResponse.exceptions_success_count > 0
    ) {
      addSuccess(i18n.SUCCESSFULLY_IMPORTED_EXCEPTIONS(importResponse.exceptions_success_count));
    }

    if (importResponse.exceptions_errors != null && importResponse.exceptions_errors.length > 0) {
      const error = formatError(
        errorMessageDetailed,
        importResponse,
        importResponse.exceptions_errors
      );

      addError(error, { title: i18n.IMPORT_FAILED(importResponse.exceptions_errors.length) });
    }
  } else {
    // rules response actions
    if (importResponse.success) {
      addSuccess(successMessage(importResponse.success_count));
    }

    if (importResponse.errors.length > 0) {
      const error = formatError(errorMessageDetailed, importResponse, importResponse.errors);
      addError(error, { title: errorMessage(importResponse.errors.length) });
    }
  }
};
