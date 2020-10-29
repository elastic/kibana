/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { decodeOrThrow } from '../runtime_types';
import { JsonArray } from '../typed_json';

export const logEntryCursorRT = rt.type({
  time: rt.number,
  tiebreaker: rt.number,
});

export type LogEntryCursor = rt.TypeOf<typeof logEntryCursorRT>;

export const getLogEntryCursorFromFields = (timestampField: string, tiebreakerField: string) => (
  fields: Record<string, JsonArray>
) =>
  decodeOrThrow(logEntryCursorRT)({
    time: fields?.[timestampField]?.[0],
    tiebreaker: fields?.[tiebreakerField]?.[0],
  });
