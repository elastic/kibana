/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * A handful of helper functions for testing the task manager.
 */

// Caching this here to avoid setTimeout mocking affecting our tests.
const nativeTimeout = setTimeout;

/**
 * Creates a mock task manager Logger.
 */
export function mockLogger() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

interface Resolvable {
  resolve: () => void;
}

/**
 * Creates a promise which can be resolved externally, useful for
 * coordinating async tests.
 */
export function resolvable(): PromiseLike<void> & Resolvable {
  let resolve: () => void;
  const result = new Promise<void>(r => (resolve = r)) as any;

  result.resolve = () => nativeTimeout(resolve, 0);

  return result;
}

/**
 * A simple helper for waiting a specified number of milliseconds.
 *
 * @param {number} ms
 */
export async function sleep(ms: number) {
  return new Promise(r => nativeTimeout(r, ms));
}
