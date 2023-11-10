/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith } from 'lodash';
import type { ToolingLogTextWriterConfig } from '@kbn/tooling-log';
import { ToolingLog } from '@kbn/tooling-log';

export const RETRYABLE_TRANSIENT_ERRORS: Readonly<Array<string | RegExp>> = [
  'no_shard_available_action_exception',
  'illegal_index_shard_state_exception',
];

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
  errors: Array<string | RegExp> | Readonly<Array<string | RegExp>>,
  logger?: ToolingLog,
  tryCount: number = 5,
  interval: number = 10000
): Promise<T> => {
  const log = logger ?? createToolingLogger('silent');
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

  log.indent(4);

  let attempt = 1;
  let responsePromise: Promise<T>;

  while (attempt <= tryCount) {
    const thisAttempt = attempt;
    attempt++;

    log.info(msg(`attempt ${thisAttempt} started at: ${new Date().toISOString()}`));

    try {
      responsePromise = callback(); // store promise so that if it fails and no more attempts, we return the last failure
      const result = await responsePromise;

      log.info(msg(`attempt ${thisAttempt} was successful. Exiting retry`));
      log.indent(-4);

      return result;
    } catch (err) {
      log.info(msg(`attempt ${thisAttempt} failed with: ${err.message}`), err);

      // If not an error that is retryable, then end loop here and return that error;
      if (!isRetryableError(err)) {
        log.error(err);
        log.error(msg('non-retryable error encountered'));
        log.indent(-4);
        return Promise.reject(err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  log.error(msg(`max retry attempts reached. returning last failure`));
  log.indent(-4);

  // Last resort: return the last rejected Promise.
  // @ts-expect-error TS2454: Variable 'responsePromise' is used before being assigned.
  return responsePromise;
};

interface CreateLoggerInterface {
  (level?: Partial<ToolingLogTextWriterConfig>['level']): ToolingLog;

  /**
   * The default log level if one is not provided to the `createToolingLogger()` utility.
   * Can be used to globally set the log level to calls made to this utility with no `level` set
   * on input.
   */
  defaultLogLevel: ToolingLogTextWriterConfig['level'];
}

/**
 * Creates an instance of `ToolingLog` that outputs to `stdout`.
 * The default log `level` for all instances can be set by setting the function's `defaultLogLevel`.
 * Log level can also be explicitly set on input.
 *
 * @param level
 *
 * @example
 * // Set default log level - example: from cypress for CI jobs
 * createLogger.defaultLogLevel = 'verbose'
 */
export const createToolingLogger: CreateLoggerInterface = (level): ToolingLog => {
  return new ToolingLog({
    level: level || createToolingLogger.defaultLogLevel,
    writeTo: process.stdout,
  });
};
createToolingLogger.defaultLogLevel = 'info';
