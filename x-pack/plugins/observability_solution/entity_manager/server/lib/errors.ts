/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class UnexpectedEntityManagerError extends Error {
  constructor(error: unknown) {
    let message;
    let cause;
    if (error instanceof Error) {
      message = error.message;
      cause = error.cause;
    } else {
      // Realistically, this should never happen.
      const realError = new Error(JSON.stringify(error));
      message = realError.message;
      cause = realError.cause;
    }

    super(`The Entity Manager faced an unexpected error: ${message}`, {
      cause,
    });
    this.name = 'UnexpectedEntityManagerError';
  }
}
