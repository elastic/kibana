/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolingLog } from '@kbn/tooling-log';

const toText = (message: unknown): string => {
  if (typeof message === 'function') return String((message as () => unknown)());
  if (message instanceof Error) return message.message;
  return String(message);
};

/**
 * The optimizer and the page store log through Kibana's `Logger`; an eval has the test runner's
 * `ToolingLog`. This lets the real server code run in an eval and report to the test log.
 */
export const toKibanaLogger = (
  log: Pick<ToolingLog, 'debug' | 'info' | 'warning' | 'error'>
): Logger => {
  const logger: Logger = {
    trace: (message: unknown) => log.debug(toText(message)),
    debug: (message: unknown) => log.debug(toText(message)),
    info: (message: unknown) => log.info(toText(message)),
    warn: (message: unknown) => log.warning(toText(message)),
    error: (message: unknown) => log.error(toText(message)),
    fatal: (message: unknown) => log.error(toText(message)),
    log: () => {},
    isLevelEnabled: () => true,
    get: () => logger,
  };
  return logger;
};
