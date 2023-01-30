/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { BulkError } from '../../../../../routes/utils';
import { createBulkErrorObject } from '../../../../../routes/utils';
import type { ConflictError, ErrorType, ImportRuleActionConnectorsResult, SOError } from '../types';

export const returnErroredImportResult = (error: ErrorType): ImportRuleActionConnectorsResult => ({
  success: false,
  errors: [handleActionConnectorsErrors(error)],
  successCount: 0,
  warnings: [],
});

export const handleActionsHaveNoConnectors = (
  actionsIds: string[],
  ruleIds: string
): ImportRuleActionConnectorsResult => {
  if (actionsIds && actionsIds.length) {
    const errors: BulkError[] = [];
    const errorMessage =
      actionsIds.length > 1
        ? 'connectors are missing. Connector ids missing are:'
        : 'connector is missing. Connector id missing is:';
    errors.push(
      createBulkErrorObject({
        statusCode: 404,
        message: `${actionsIds.length} ${errorMessage} ${actionsIds.join(', ')}`,
        ruleId: ruleIds,
      })
    );
    return {
      success: false,
      errors,
      successCount: 0,
      warnings: [],
    };
  }
  return {
    success: true,
    errors: [],
    successCount: 0,
    warnings: [],
  };
};

export const handleActionConnectorsErrors = (error: ErrorType, id?: string): BulkError => {
  let statusCode: number | null = null;
  let message: string = '';
  if ('output' in error) {
    statusCode = (error as SOError).output.statusCode;
    message = (error as SOError).output.payload?.message;
  }
  switch (statusCode) {
    case null:
      return createBulkErrorObject({
        statusCode: 500,
        message: (error as ConflictError)?.type === 'conflict' ? 'There is a conflict' : '', // TODO : choose a message when conflict happen
      });

    case 403:
      return createBulkErrorObject({
        id,
        statusCode,
        message: `You may not have actions privileges required to import rules with actions: ${message}`,
      });

    default:
      return createBulkErrorObject({
        id,
        statusCode,
        message,
      });
  }
};

export const mapSOErrorToRuleError = (errors: SavedObjectsImportFailure[]): BulkError[] => {
  return errors.map(({ id, error }) => handleActionConnectorsErrors(error, id));
};
