/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';

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
