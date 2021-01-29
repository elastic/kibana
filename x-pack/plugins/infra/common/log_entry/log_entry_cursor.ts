/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { decodeOrThrow } from '../runtime_types';

export const logEntryCursorRT = rt.type({
  time: rt.number,
  tiebreaker: rt.number,
});

export type LogEntryCursor = rt.TypeOf<typeof logEntryCursorRT>;

export const getLogEntryCursorFromHit = (hit: { sort: [number, number] }) =>
  decodeOrThrow(logEntryCursorRT)({
    time: hit.sort[0],
    tiebreaker: hit.sort[1],
  });
