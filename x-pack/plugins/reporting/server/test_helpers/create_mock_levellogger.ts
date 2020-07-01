/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger } from '../lib';

export function createMockLevelLogger() {
  // eslint-disable-next-line no-console
  const consoleLogger = (tag: string) => (message: unknown) => console.log(tag, message);
  const innerLogger = {
    get: () => innerLogger,
    debug: consoleLogger('debug'),
    info: consoleLogger('info'),
    warn: consoleLogger('warn'),
    trace: consoleLogger('trace'),
    error: consoleLogger('error'),
    fatal: consoleLogger('fatal'),
    log: consoleLogger('log'),
  };
  return new LevelLogger(innerLogger);
}
