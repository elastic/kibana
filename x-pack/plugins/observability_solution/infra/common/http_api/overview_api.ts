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

export const TopNodesRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    size: rt.number,
    bucketSize: rt.string,
    timerange: rt.type({
      from: rt.number,
      to: rt.number,
    }),
  }),
  rt.partial({ sort: rt.string, sortDirection: rt.string }),
]);

export type TopNodesRequest = rt.TypeOf<typeof TopNodesRequestRT>;

const numberOrNullRT = rt.union([rt.number, rt.null]);
const stringOrNullRT = rt.union([rt.string, rt.null]);

export const TopNodesTimeseriesRowRT = rt.type({
  timestamp: rt.number,
  cpu: numberOrNullRT,
  iowait: numberOrNullRT,
  load: numberOrNullRT,
  rx: numberOrNullRT,
  tx: numberOrNullRT,
});

export const TopNodesSeriesRT = rt.type({
  id: rt.string,
  name: stringOrNullRT,
  platform: stringOrNullRT,
  provider: stringOrNullRT,
  cpu: numberOrNullRT,
  iowait: numberOrNullRT,
  load: numberOrNullRT,
  uptime: numberOrNullRT,
  rx: numberOrNullRT,
  tx: numberOrNullRT,
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
