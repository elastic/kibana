/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeKey, UniqueTimeKey } from '@kbn/io-ts-utils';
import { bisector } from 'd3-array';
import { compareToTimeKey, getIndexAtTimeKey } from '../../../common/time';
import {
  LogEntry,
  LogColumn,
  LogTimestampColumn,
  LogFieldColumn,
  LogMessageColumn,
  LogMessagePart,
  LogMessageFieldPart,
  LogMessageConstantPart,
} from '../../../common/log_entry';

export const getLogEntryKey = (entry: { cursor: TimeKey }) => entry.cursor;

export const getUniqueLogEntryKey = (entry: { id: string; cursor: TimeKey }): UniqueTimeKey => ({
  ...entry.cursor,
  gid: entry.id,
});

const logEntryTimeBisector = bisector(compareToTimeKey(getLogEntryKey));

export const getLogEntryIndexBeforeTime = logEntryTimeBisector.left;
export const getLogEntryIndexAfterTime = logEntryTimeBisector.right;
export const getLogEntryIndexAtTime = getIndexAtTimeKey(getLogEntryKey);

export const getLogEntryAtTime = (entries: LogEntry[], time: TimeKey) => {
  const entryIndex = getLogEntryIndexAtTime(entries, time);

  return entryIndex !== null ? entries[entryIndex] : null;
};

export const isTimestampColumn = (column: LogColumn): column is LogTimestampColumn =>
  column != null && 'time' in column;

export const isMessageColumn = (column: LogColumn): column is LogMessageColumn =>
  column != null && 'message' in column;

export const isFieldColumn = (column: LogColumn): column is LogFieldColumn =>
  column != null && 'field' in column;

export const isConstantSegment = (segment: LogMessagePart): segment is LogMessageConstantPart =>
  'constant' in segment;

export const isFieldSegment = (segment: LogMessagePart): segment is LogMessageFieldPart =>
  'field' in segment && 'value' in segment;
