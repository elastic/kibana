/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import get from 'lodash/get';
import has from 'lodash/has';

const PARSING_ERROR_TYPE = 'parsing_exception';
const VERIFICATION_ERROR_TYPE = 'verification_exception';

interface ErrorCause {
  type: string;
  reason: string;
}

export interface ValidationErrorResponse {
  error: ErrorCause & { root_cause: ErrorCause[] };
}

export const isValidationErrorType = (type: unknown): boolean =>
  type === PARSING_ERROR_TYPE || type === VERIFICATION_ERROR_TYPE;

export const isValidationErrorResponse = (response: unknown): response is ValidationErrorResponse =>
  has(response, 'error.type') && isValidationErrorType(get(response, 'error.type'));

export const getValidationErrors = (response: ValidationErrorResponse): string[] =>
  response.error.root_cause
    .filter((cause) => isValidationErrorType(cause.type))
    .map((cause) => cause.reason);
