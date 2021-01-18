/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { TimeKey } from '../time';
import { logEntryCursorRT } from './log_entry_cursor';
import { jsonArrayRT } from '../typed_json';

export interface LogEntryOrigin {
  id: string;
  index: string;
  type: string;
}

export type LogEntryTime = TimeKey;

export interface LogEntryFieldsMapping {
  message: string;
  tiebreaker: string;
  time: string;
}

export function isEqual(time1: LogEntryTime, time2: LogEntryTime) {
  return time1.time === time2.time && time1.tiebreaker === time2.tiebreaker;
}

export function isLess(time1: LogEntryTime, time2: LogEntryTime) {
  return (
    time1.time < time2.time || (time1.time === time2.time && time1.tiebreaker < time2.tiebreaker)
  );
}

export function isLessOrEqual(time1: LogEntryTime, time2: LogEntryTime) {
  return (
    time1.time < time2.time || (time1.time === time2.time && time1.tiebreaker <= time2.tiebreaker)
  );
}

export function isBetween(min: LogEntryTime, max: LogEntryTime, operand: LogEntryTime) {
  return isLessOrEqual(min, operand) && isLessOrEqual(operand, max);
}

export const logMessageConstantPartRT = rt.type({
  constant: rt.string,
});
export const logMessageFieldPartRT = rt.type({
  field: rt.string,
  value: jsonArrayRT,
  highlights: rt.array(rt.string),
});

export const logMessagePartRT = rt.union([logMessageConstantPartRT, logMessageFieldPartRT]);

export const logTimestampColumnRT = rt.type({ columnId: rt.string, timestamp: rt.number });
export const logFieldColumnRT = rt.type({
  columnId: rt.string,
  field: rt.string,
  value: jsonArrayRT,
  highlights: rt.array(rt.string),
});
export const logMessageColumnRT = rt.type({
  columnId: rt.string,
  message: rt.array(logMessagePartRT),
});

export const logColumnRT = rt.union([logTimestampColumnRT, logFieldColumnRT, logMessageColumnRT]);

export const logEntryContextRT = rt.union([
  rt.type({}),
  rt.type({ 'container.id': rt.string }),
  rt.type({ 'host.name': rt.string, 'log.file.path': rt.string }),
]);

export const logEntryRT = rt.type({
  id: rt.string,
  cursor: logEntryCursorRT,
  columns: rt.array(logColumnRT),
  context: logEntryContextRT,
});

export type LogMessageConstantPart = rt.TypeOf<typeof logMessageConstantPartRT>;
export type LogMessageFieldPart = rt.TypeOf<typeof logMessageFieldPartRT>;
export type LogMessagePart = rt.TypeOf<typeof logMessagePartRT>;
export type LogEntryContext = rt.TypeOf<typeof logEntryContextRT>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;
export type LogTimestampColumn = rt.TypeOf<typeof logTimestampColumnRT>;
export type LogFieldColumn = rt.TypeOf<typeof logFieldColumnRT>;
export type LogMessageColumn = rt.TypeOf<typeof logMessageColumnRT>;
export type LogColumn = rt.TypeOf<typeof logColumnRT>;
