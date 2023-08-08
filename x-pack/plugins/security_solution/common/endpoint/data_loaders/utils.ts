/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';

export class EndpointDataLoadingError extends Error {
  constructor(message: string, public meta?: unknown) {
    super(message);
  }
}

export const wrapErrorIfNeeded = (error: Error): EndpointDataLoadingError =>
  error instanceof EndpointDataLoadingError
    ? error
    : new EndpointDataLoadingError(error.message, error);

// Use it in Promise's `.catch()` as `.catch(wrapErrorAndRejectPromise)`
export const wrapErrorAndRejectPromise = (error: Error) => Promise.reject(wrapErrorIfNeeded(error));

export const mergeAndAppendArrays = <T, S>(destinationObj: T, srcObj: S): T => {
  const customizer = (objValue: T[keyof T], srcValue: S[keyof S]) => {
    if (Array.isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  };

  return mergeWith(destinationObj, srcObj, customizer);
};

/**
 * Call the provided `callback` and retry that call if it fails and the error in the failure
 * contains one of the `errors` provided.
 * @param callback
 * @param errors
 * @param tryCount
 * @param interval
 * @param logger
 */
export const retryOnError = async <T>(
  callback: () => Promise<T>,
  errors: Array<string | RegExp>,
  logger?: ToolingLog,
  tryCount: number = 5,
  interval: number = 10000
): Promise<T> => {
  const log = logger ?? new ToolingLog({ writeTo: { write(_: string) {} }, level: 'silent' });
  const msg = (message: string): string => `retryOnError(): ${message}`;
  const isRetryableError = (err: Error): boolean => {
    return errors.some((retryMessage) => {
      if (typeof retryMessage === 'string') {
        return err.message.includes(retryMessage);
      } else {
        return retryMessage.test(err.message);
      }
    });
  };

  let attempt = 1;
  let responsePromise: Promise<T>;

  while (attempt <= tryCount) {
    const thisAttempt = attempt;
    attempt++;

    log.info(msg(`attempt ${thisAttempt} started at: ${new Date().toISOString()}`));

    try {
      responsePromise = callback(); // store promise so that if it fails and no more attempts, we return the last failure
      return await responsePromise;
    } catch (err) {
      log.info(msg(`attempt ${thisAttempt} failed with: ${err.message}`), err);

      // If not an error that is retryable, then end loop here and return that error;
      if (!isRetryableError(err)) {
        log.error(err);
        return Promise.reject(err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // @ts-expect-error TS2454: Variable 'responsePromise' is used before being assigned.
  return responsePromise;
};
