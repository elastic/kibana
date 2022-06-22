/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BULK_ACTIONS_DRY_RUN_ERR_CODE } from '../../../../../common/constants';

/**
 * Error instance that has properties: errorCode & statusCode to use within run_dry
 * {@link BULK_ACTIONS_DRY_RUN_ERR_CODE | errorCode} is used to categorize error and make possible to handle it later
 */
export class DryRunError extends Error {
  public readonly errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE;
  public readonly statusCode: number;

  constructor(message: string, errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE, statusCode?: number) {
    super(message);
    this.name = 'BulkActionDryRunError';
    this.errorCode = errorCode;
    this.statusCode = statusCode ?? 500;
  }
}

/**
 * executes function, if error thrown, wraps this error into {@link DryRunError}
 * @param executor - function that can be executed
 * @param errorCode - enum error code {@link BULK_ACTIONS_DRY_RUN_ERR_CODE} to use in DryRunError wrapper
 */
export const throwDryRunError = async (
  executor: () => void,
  errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE
) => {
  try {
    await executor();
  } catch (e) {
    throw new DryRunError(e.message, errorCode, e.statusCode);
  }
};
