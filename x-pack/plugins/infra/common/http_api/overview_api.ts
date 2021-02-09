/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const TopNodesRequestRT = rt.type({
  sourceId: rt.string,
  size: rt.number,
  timerange: rt.type({
    from: rt.number,
    to: rt.number,
  }),
});

export type TopNodesRequest = rt.TypeOf<typeof TopNodesRequestRT>;

const numberOrNullRT = rt.union([rt.number, rt.null]);
const stringOrNullRT = rt.union([rt.string, rt.null]);

export const TopNodesTimeseriesRowRT = rt.type({
  timestamp: rt.number,
  cpu: numberOrNullRT,
  iowait: numberOrNullRT,
  load: numberOrNullRT,
  diskUsage: numberOrNullRT,
});

export const TopNodesSeriesRT = rt.type({
  id: rt.string,
  name: stringOrNullRT,
  platform: stringOrNullRT,
  provider: stringOrNullRT,
  metrics: rt.type({
    cpu: numberOrNullRT,
    diskUsage: numberOrNullRT,
    iowait: numberOrNullRT,
    load: numberOrNullRT,
    uptime: numberOrNullRT,
  }),
  timeseries: rt.array(TopNodesTimeseriesRowRT),
});

export const TopNodesResponseRT = rt.type({
  series: rt.array(TopNodesSeriesRT),
});

export type TopNodesResponse = rt.TypeOf<typeof TopNodesResponseRT>;

export type OverviewMetricType = rt.TypeOf<typeof OverviewMetricTypeRT>;
export type OverviewMetric = rt.TypeOf<typeof OverviewMetricRT>;
export type OverviewResponse = rt.TypeOf<typeof OverviewResponseRT>;
export type OverviewRequest = rt.TypeOf<typeof OverviewRequestRT>;
