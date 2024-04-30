/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import { inspect } from 'util';

/**
 * Capture and return the calling stack for the context that called this utility.
 */
export const captureCallingStack = () => {
  const s = { stack: '' };
  Error.captureStackTrace(s);
  return `Called from:\n${s.stack.split('\n').slice(3).join('\n')}`;
};

/**
 * Returns a logger that intercepts calls to the ToolingLog instance methods passed in input
 * and prefix it with the provided value. Useful in order to track log entries, especially when
 * logging output from multiple sources is concurrently being output to the same source
 * (ex. CI jobs and output to stdout).
 *
 * @param prefix
 * @param log
 *
 * @example
 * const logger = new ToolingLog();
 * const prefixedLogger = prefixedOutputLogger('my_log', logger);
 *
 * prefixedLogger.info('log something'); // => info [my_log] log something
 */
export const prefixedOutputLogger = (prefix: string, log: ToolingLog): ToolingLog => {
  const styledPrefix = `[${chalk.grey(prefix)}]`;
  const logIt = (type: keyof ToolingLog, ...args: any) => {
    return log[type](styledPrefix, ...args);
  };

  const logger: Partial<ToolingLog> = {
    info: logIt.bind(null, 'info'),
    debug: logIt.bind(null, 'debug'),
    verbose: logIt.bind(null, 'verbose'),
    success: logIt.bind(null, 'success'),
    warning: logIt.bind(null, 'warning'),
    write: logIt.bind(null, 'write'),
  };

  const proxy = new Proxy(log, {
    get(target: ToolingLog, prop: keyof ToolingLog, receiver: any): any {
      if (prop in logger) {
        return logger[prop];
      }

      return log[prop];
    },
  });

  return proxy;
};

/**
 * Safely traverse some content (object, array, etc) and stringify it
 * @param content
 * @param depth
 */
export const dump = (content: any, depth: number = 5): string => {
  return inspect(content, { depth });
};

export interface DeferredPromiseInterface<T = void> {
  promise: Promise<T>;
  resolve: (data: T) => void;
  reject: (e: Error) => void;
}

/**
 * Returns back an interface that provide a Promise along with exposed method to resolve it and reject it
 * from outside of the actual Promise executor
 */
export const getDeferredPromise = function <T = void>(): DeferredPromiseInterface<T> {
  let resolve: DeferredPromiseInterface<T>['resolve'];
  let reject: DeferredPromiseInterface<T>['reject'];

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  // @ts-ignore
  return { promise, resolve, reject };
};
