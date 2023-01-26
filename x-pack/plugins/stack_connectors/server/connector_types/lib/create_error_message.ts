/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';

export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}

export const createErrorMessage = (errorResponse: ResponseError | null | undefined): string => {
  if (!errorResponse) return 'unknown: errorResponse was empty';

  const { errorMessages, errors } = errorResponse;

  if (Array.isArray(errorMessages) && errorMessages.length > 0) {
    return `${errorMessages.join(', ')}`;
  }

  if (errors == null) {
    return 'unknown: errorResponse.errors was null';
  }

  return Object.entries(errors).reduce((errorMessage, [, value]) => {
    const msg = errorMessage.length > 0 ? `${errorMessage} ${value}` : value;
    return msg;
  }, '');
};
