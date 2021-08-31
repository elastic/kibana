/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { currentTimeAsString } from './utils';

interface LogMessage {
  timestamp: string;
  message: string;
  error?: string;
}

export const asyncSearchServiceLogProvider = () => {
  const log: LogMessage[] = [];

  function addLogMessage(message: string, error?: string) {
    log.push({
      timestamp: currentTimeAsString(),
      message,
      ...(error !== undefined ? { error } : {}),
    });
  }

  function getLogMessages() {
    return log.map((l) => `${l.timestamp}: ${l.message}`);
  }

  return { addLogMessage, getLogMessages };
};

export type AsyncSearchServiceLog = ReturnType<
  typeof asyncSearchServiceLogProvider
>;
