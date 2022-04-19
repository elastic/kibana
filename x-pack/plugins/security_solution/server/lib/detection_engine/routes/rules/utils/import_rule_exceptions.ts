/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionListClient } from '@kbn/lists-plugin/server';

/**
 * Util to call into exceptions list client import logic
 * @param exceptions {array} - exception lists and items to import
 * @param exceptionsClient {object}
 * @param overwrite {boolean} - user defined value whether or not to overwrite
 * any exception lists found to have an existing matching list
 * @param maxExceptionsImportSize {number} - max number of exception objects allowed to import
 * @returns {Promise} an object summarizing success and errors during import
 */
export const importRuleExceptions = async ({
  exceptions,
  exceptionsClient,
  overwrite,
  maxExceptionsImportSize,
}: {
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  exceptionsClient: ExceptionListClient | undefined;
  overwrite: boolean;
  maxExceptionsImportSize: number;
}) => {
  if (exceptionsClient == null) {
    return {
      success: true,
      errors: [],
      successCount: 0,
    };
  }

  const {
    errors,
    success,
    success_count: successCount,
  } = await exceptionsClient.importExceptionListAndItemsAsArray({
    exceptionsToImport: exceptions,
    overwrite,
    maxExceptionsImportSize,
  });

  return {
    errors,
    success,
    successCount,
  };
};
