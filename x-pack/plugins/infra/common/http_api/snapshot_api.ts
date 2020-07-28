/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { SnapshotMetricTypeRT, ItemTypeRT } from '../inventory_models/types';
import { metricsExplorerSeriesRT } from './metrics_explorer';

export const SnapshotNodePathRT = rt.intersection([
  rt.type({
    value: rt.string,
    label: rt.string,
  }),
  rt.partial({
    ip: rt.union([rt.string, rt.null]),
  }),
]);

const SnapshotNodeMetricOptionalRT = rt.partial({
  value: rt.union([rt.number, rt.null]),
  avg: rt.union([rt.number, rt.null]),
  max: rt.union([rt.number, rt.null]),
  timeseries: metricsExplorerSeriesRT,
});

const SnapshotNodeMetricRequiredRT = rt.type({
  name: SnapshotMetricTypeRT,
});

export const SnapshotNodeMetricRT = rt.intersection([
  SnapshotNodeMetricRequiredRT,
  SnapshotNodeMetricOptionalRT,
]);
export const SnapshotNodeRT = rt.type({
  metrics: rt.array(SnapshotNodeMetricRT),
  path: rt.array(SnapshotNodePathRT),
});

export const SnapshotNodeResponseRT = rt.type({
  nodes: rt.array(SnapshotNodeRT),
  interval: rt.string,
});

export const InfraTimerangeInputRT = rt.intersection([
  rt.type({
    interval: rt.string,
    to: rt.number,
    from: rt.number,
  }),
  rt.partial({
    lookbackSize: rt.number,
    ignoreLookback: rt.boolean,
    forceInterval: rt.boolean,
  }),
]);

export const SnapshotGroupByRT = rt.array(
  rt.partial({
    label: rt.union([rt.string, rt.null]),
    field: rt.union([rt.string, rt.null]),
  })
);

export const SnapshotNamedMetricInputRT = rt.type({
  type: SnapshotMetricTypeRT,
});

export const SNAPSHOT_CUSTOM_AGGREGATIONS = ['avg', 'max', 'min', 'rate'] as const;

export type SnapshotCustomAggregation = typeof SNAPSHOT_CUSTOM_AGGREGATIONS[number];

const snapshotCustomAggregationKeys = SNAPSHOT_CUSTOM_AGGREGATIONS.reduce<
  Record<SnapshotCustomAggregation, null>
>((acc, agg) => ({ ...acc, [agg]: null }), {} as Record<SnapshotCustomAggregation, null>);

export const SnapshotCustomAggregationRT = rt.keyof(snapshotCustomAggregationKeys);

export const SnapshotCustomMetricInputRT = rt.intersection([
  rt.type({
    type: rt.literal('custom'),
    field: rt.string,
    aggregation: SnapshotCustomAggregationRT,
    id: rt.string,
  }),
  rt.partial({
    label: rt.string,
  }),
]);

export const SnapshotMetricInputRT = rt.union([
  SnapshotNamedMetricInputRT,
  SnapshotCustomMetricInputRT,
]);

export const SnapshotRequestRT = rt.intersection([
  rt.type({
    timerange: InfraTimerangeInputRT,
    metrics: rt.array(SnapshotMetricInputRT),
    groupBy: SnapshotGroupByRT,
    nodeType: ItemTypeRT,
    sourceId: rt.string,
  }),
  rt.partial({
    accountId: rt.string,
    region: rt.string,
    filterQuery: rt.union([rt.string, rt.null]),
    includeTimeseries: rt.boolean,
  }),
]);

export type SnapshotNodePath = rt.TypeOf<typeof SnapshotNodePathRT>;
export type SnapshotMetricInput = rt.TypeOf<typeof SnapshotMetricInputRT>;
export type SnapshotCustomMetricInput = rt.TypeOf<typeof SnapshotCustomMetricInputRT>;
export type InfraTimerangeInput = rt.TypeOf<typeof InfraTimerangeInputRT>;
export type SnapshotNodeMetric = rt.TypeOf<typeof SnapshotNodeMetricRT>;
export type SnapshotGroupBy = rt.TypeOf<typeof SnapshotGroupByRT>;
export type SnapshotRequest = rt.TypeOf<typeof SnapshotRequestRT>;
export type SnapshotNode = rt.TypeOf<typeof SnapshotNodeRT>;
export type SnapshotNodeResponse = rt.TypeOf<typeof SnapshotNodeResponseRT>;
