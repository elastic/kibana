/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Validation {
  valid: boolean;
  message: string | undefined;
}

export class HttpAuthzError extends Error {
  public readonly statusCode: number;

  constructor(message: string | undefined) {
    super(message);
    this.name = 'HttpAuthzError';
    this.statusCode = 403;
  }
}

export const toHttpError = (validation: Validation): HttpAuthzError | undefined => {
  if (!validation.valid) {
    return new HttpAuthzError(validation.message);
  }
};

export const throwHttpError = (validation: Validation): void => {
  const error = toHttpError(validation);
  if (error) {
    throw error;
  }
};
