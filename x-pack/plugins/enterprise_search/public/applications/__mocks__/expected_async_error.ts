/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const expectedAsyncError = async (promise: Promise<unknown>) => {
  let expectedError: unknown;

  try {
    await promise;
  } catch (e) {
    // Silence expected errors from being reported by tests

    // Pass back expected error to optionally assert on
    expectedError = e;
  }

  return expectedError;
};
