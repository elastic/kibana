/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This module provides a helper to perform retries on a function if the
// function ends up throwing a SavedObject 404 Not Found. This can happen
// when the various socket hang up, ECONNRESET or some "normal" lifecycle
// events are occurring: migrations, ES | Kibana restarted, etc.

import { Logger, SavedObjectsErrorHelpers } from '../../../../../src/core/server';

type RetryableForNotFound<T> = () => Promise<T>;

// number of times to retry when not found error occur
export const RetryForNotFoundAttempts = 2;

// milliseconds to wait before retrying when not found error occur
// note: we considered making this random, to help avoid a stampede, but
// with 1 retry it probably doesn't matter, and adding randomness could
// make it harder to diagnose issues
const RetryForNotFoundDelay = 250;

// retry an operation if it runs into 404 Not Found's, up to the limit
export async function retryIfNotFound<T>(
  logger: Logger,
  name: string,
  operation: RetryableForNotFound<T>,
  retries: number = RetryForNotFoundAttempts
): Promise<T> {
  // run the operation, return if no errors or throw if not a not found error get the max number of attempts
  try {
    return await operation();
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }

    // must be a not found; if no retries left, throw it
    if (retries <= 0) {
      logger.warn(`${name} not found, exceeded retries`);
      throw err;
    }

    // delay a bit before retrying
    logger.debug(`${name} not found, retrying ...`);
    await waitBeforeNextRetry();
    return await retryIfNotFound(logger, name, operation, retries - 1);
  }
}

async function waitBeforeNextRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RetryForNotFoundDelay));
}
