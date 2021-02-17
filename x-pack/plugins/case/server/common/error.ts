/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper class for wrapping errors while preserving the original thrown error.
 */
export class CaseError extends Error {
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
