/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bisector } from 'd3-array';

import { LogEntries as LogEntriesQuery } from '../../../common/graphql/types';
import { compareToTimeKey, getIndexAtTimeKey, TimeKey } from '../../../common/time';

export type LogEntry = LogEntriesQuery.Entries;

export type LogEntryMessageSegment = LogEntriesQuery.Message;

export const getLogEntryKey = (entry: LogEntry) => entry.key;

const logEntryTimeBisector = bisector(compareToTimeKey(getLogEntryKey));

export const getLogEntryIndexBeforeTime = logEntryTimeBisector.left;
export const getLogEntryIndexAfterTime = logEntryTimeBisector.right;
export const getLogEntryIndexAtTime = getIndexAtTimeKey(getLogEntryKey);

export const getLogEntryAtTime = (entries: LogEntry[], time: TimeKey) => {
  const entryIndex = getLogEntryIndexAtTime(entries, time);

  return entryIndex !== null ? entries[entryIndex] : null;
};
