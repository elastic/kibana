/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts error message from an error
 *
 * @param error Unknown error
 * @returns error message
 */
export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error';
  }
};

const hasStatusCode = (error: unknown): error is { statusCode: unknown } =>
  typeof error === 'object' && error !== null && 'statusCode' in error;

/**
 * Extracts status code from an error
 *
 * @param error Unknown error
 * @returns Stats code if it exists
 */
export const getErrorStatusCode = (error: unknown): number | undefined => {
  if (hasStatusCode(error)) {
    return Number(error.statusCode);
  }
  return undefined;
};
