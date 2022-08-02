/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, isBoom } from '@hapi/boom';
import { Logger } from '@kbn/core/server';

export interface HTTPError extends Error {
  statusCode: number;
}

/**
 * Helper class for wrapping errors while preserving the original thrown error.
 */
export class CaseError extends Error {
  public readonly wrappedError?: Error;
  constructor(message?: string, originalError?: Error) {
    super(message);
    this.name = this.constructor.name; // for stack traces
    if (isCaseError(originalError)) {
      this.wrappedError = originalError.wrappedError;
    } else {
      this.wrappedError = originalError;
    }
  }

  /**
   * This function creates a boom representation of the error. If the wrapped error is a boom we'll grab the statusCode
   * and data from that.
   */
  public boomify(): Boom<unknown> {
    const message = this.wrappedError?.message ?? this.message;
    let statusCode = 500;
    let data: unknown | undefined;

    if (isBoom(this.wrappedError)) {
      data = this.wrappedError?.data;
      statusCode = this.wrappedError?.output?.statusCode ?? 500;
    }

    return new Boom(message, {
      data,
      statusCode,
    });
  }
}

/**
 * Type guard for determining if an error is a CaseError
 */
export function isCaseError(error: unknown): error is CaseError {
  return error instanceof CaseError;
}

/**
 * Type guard for determining if an error is an HTTPError
 */
export function isHTTPError(error: unknown): error is HTTPError {
  return (error as HTTPError)?.statusCode != null;
}

/**
 * Create a CaseError that wraps the original thrown error. This also logs the message that will be placed in the CaseError
 * if the logger was defined.
 */
export function createCaseError({
  message,
  error,
  logger,
}: {
  message?: string;
  error?: Error;
  logger?: Logger;
}) {
  const logMessage: string | undefined = message ?? error?.toString();
  if (logMessage !== undefined) {
    logger?.error(logMessage);
  }

  return new CaseError(message, error);
}
