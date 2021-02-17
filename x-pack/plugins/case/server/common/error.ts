/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

/**
 * Helper class for wrapping errors while preserving the original thrown error.
 */
class CaseError extends Error {
  public readonly wrappedError?: Error;
  constructor(message?: string, originalError?: Error) {
    super(message);
    this.name = this.constructor.name; // for stack traces
    if (originalError && originalError instanceof CaseError) {
      this.wrappedError = originalError.wrappedError;
    } else {
      this.wrappedError = originalError;
    }
  }
}

/**
 * Create a CaseError that wraps the original thrown error. This also logs the message that will be placed in the CaseError.
 */
export function createCaseError({
  message,
  error,
  logger,
}: {
  message?: string;
  error?: Error;
  logger: Logger;
}) {
  if (message !== undefined) {
    logger.error(message);
  }

  return new CaseError(message, error);
}
