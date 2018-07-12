/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLogEntryKey,
  isEqual,
  isLess,
  isLessOrEqual,
  LogEntry,
  LogEntryTime,
} from './log_entry';

export type LogEntryList = LogEntry[];

export function getIndexNearLogEntry(logEntries: LogEntryList, key: LogEntryTime, highest = false) {
  let minIndex = 0;
  let maxIndex = logEntries.length;
  let currentIndex: number;
  let currentKey: LogEntryTime;

  while (minIndex < maxIndex) {
    currentIndex = (minIndex + maxIndex) >>> 1; // tslint:disable-line:no-bitwise
    currentKey = getLogEntryKey(logEntries[currentIndex]);

    if ((highest ? isLessOrEqual : isLess)(currentKey, key)) {
      minIndex = currentIndex + 1;
    } else {
      maxIndex = currentIndex;
    }
  }

  return maxIndex;
}

export function getIndexOfLogEntry(logEntries: LogEntry[], key: LogEntryTime) {
  const index = getIndexNearLogEntry(logEntries, key);
  const logEntry = logEntries[index];

  return logEntry && isEqual(key, getLogEntryKey(logEntry)) ? index : null;
}
