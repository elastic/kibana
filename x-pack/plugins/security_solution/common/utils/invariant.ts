/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class InvariantError extends Error {
  name = 'InvariantError';
}

/**
 * Asserts that the provided condition is always true
 * and throws an invariant violation error otherwise
 *
 * @param condition Condition to assert
 * @param message Error message to throw if the condition is falsy
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}
