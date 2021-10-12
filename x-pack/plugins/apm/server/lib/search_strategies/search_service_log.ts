/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface LogMessage {
  timestamp: string;
  message: string;
  error?: string;
}

export const currentTimeAsString = () => new Date().toISOString();

export const searchServiceLogProvider = () => {
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

export type SearchServiceLog = ReturnType<typeof searchServiceLogProvider>;
