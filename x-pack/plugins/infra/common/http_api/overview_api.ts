/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const OverviewMetricTypeRT = rt.keyof({
  percent: null,
  number: null,
  bytesPerSecond: null,
});

export const OverviewMetricRT = rt.type({
  type: rt.string,
  value: rt.number,
});

export const OverviewResponseRT = rt.type({
  stats: rt.type({
    hosts: OverviewMetricRT,
    cpu: OverviewMetricRT,
    memory: OverviewMetricRT,
  }),
});

export const OverviewRequestRT = rt.type({
  sourceId: rt.string,
  timerange: rt.type({
    from: rt.number,
    to: rt.number,
  }),
});

export type OverviewMetricType = rt.TypeOf<typeof OverviewMetricTypeRT>;
export type OverviewMetric = rt.TypeOf<typeof OverviewMetricRT>;
export type OverviewResponse = rt.TypeOf<typeof OverviewResponseRT>;
export type OverviewRequest = rt.TypeOf<typeof OverviewRequestRT>;
