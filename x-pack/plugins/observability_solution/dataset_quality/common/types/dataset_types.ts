/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// https://github.com/gcanti/io-ts/blob/master/index.md#union-of-string-literals
import * as t from 'io-ts';

export const dataStreamTypesRt = t.keyof({
  logs: null,
  metrics: null,
  traces: null,
  synthetics: null,
  profiling: null,
});

export type DataStreamType = t.TypeOf<typeof dataStreamTypesRt>;
