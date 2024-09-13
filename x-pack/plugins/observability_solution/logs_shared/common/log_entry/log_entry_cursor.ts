/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { decodeOrThrow } from '../runtime_types';

export const logEntryCursorRT = rt.type({
  time: rt.string,
  tiebreaker: rt.number,
});
export type LogEntryCursor = rt.TypeOf<typeof logEntryCursorRT>;

export const logEntryBeforeCursorRT = rt.type({
  before: rt.union([logEntryCursorRT, rt.literal('last')]),
});
export type LogEntryBeforeCursor = rt.TypeOf<typeof logEntryBeforeCursorRT>;

export const logEntryAfterCursorRT = rt.type({
  after: rt.union([logEntryCursorRT, rt.literal('first')]),
});
export type LogEntryAfterCursor = rt.TypeOf<typeof logEntryAfterCursorRT>;

export const logEntryAroundCursorRT = rt.type({
  center: logEntryCursorRT,
});
export type LogEntryAroundCursor = rt.TypeOf<typeof logEntryAroundCursorRT>;

export const getLogEntryCursorFromHit = (hit: { sort: [string, number] }) =>
  decodeOrThrow(logEntryCursorRT)({
    time: hit.sort[0],
    tiebreaker: hit.sort[1],
  });
