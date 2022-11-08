/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

export interface LogInitialization {
  log: Logger;
}

interface MlLog {
  fatal: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  debug: (message: string) => void;
  trace: (message: string) => void;
}

export let mlLog: MlLog;

export function initMlServerLog(logInitialization: LogInitialization) {
  mlLog = {
    fatal: (message: string) => logInitialization.log.fatal(message),
    error: (message: string | Error) => logInitialization.log.error(message),
    warn: (message: string) => logInitialization.log.warn(message),
    info: (message: string) => logInitialization.log.info(message),
    debug: (message: string) => logInitialization.log.debug(message),
    trace: (message: string) => logInitialization.log.trace(message),
  };
}
