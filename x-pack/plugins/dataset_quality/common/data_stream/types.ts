/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const dataStreamTypeRT = rt.keyof({
  logs: null,
  metrics: null,
  traces: null,
  synthetics: null,
  profiling: null,
});

export type DataStreamType = rt.TypeOf<typeof dataStreamTypeRT>;

export const dataStreamRT = rt.strict({
  type: dataStreamTypeRT,
  dataset: rt.string,
  namespace: rt.string,
});

export type DataStream = rt.TypeOf<typeof dataStreamRT>;
