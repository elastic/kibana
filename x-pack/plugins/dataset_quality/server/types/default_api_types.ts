/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';

// https://github.com/gcanti/io-ts/blob/master/index.md#union-of-string-literals
export const dataStreamTypesRt = t.keyof({
  logs: null,
  metrics: null,
  traces: null,
  synthetics: null,
  profiling: null,
});

export const typeRt = t.partial({
  type: dataStreamTypesRt,
});

export type DataStreamTypes = t.TypeOf<typeof dataStreamTypesRt>;

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});
