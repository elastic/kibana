/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const logEntryExampleRT = rt.type({
  id: rt.string,
  dataset: rt.string,
  message: rt.string,
  timestamp: rt.number,
  tiebreaker: rt.number,
});

export type LogEntryExample = rt.TypeOf<typeof logEntryExampleRT>;
