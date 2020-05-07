/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { InventoryMetricRT, ItemTypeRT } from '../inventory_models/types';
import { InfraTimerangeInputRT } from './snapshot_api';

const NodeDetailsDataPointRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.partial({
    value: rt.union([rt.number, rt.null]),
  }),
]);

const NodeDetailsDataSeries = rt.type({
  id: rt.string,
  label: rt.string,
  data: rt.array(NodeDetailsDataPointRT),
});

export const NodeDetailsMetricDataRT = rt.intersection([
  rt.partial({
    id: rt.union([InventoryMetricRT, rt.null]),
  }),
  rt.type({
    series: rt.array(NodeDetailsDataSeries),
  }),
]);

export const NodeDetailsMetricDataResponseRT = rt.type({
  metrics: rt.array(NodeDetailsMetricDataRT),
});

export const NodeDetailsRequestRT = rt.intersection([
  rt.type({
    nodeType: ItemTypeRT,
    nodeId: rt.string,
    metrics: rt.array(InventoryMetricRT),
    timerange: InfraTimerangeInputRT,
    sourceId: rt.string,
  }),
  rt.partial({
    cloudId: rt.union([rt.string, rt.null]),
  }),
]);

// export type NodeDetailsRequest = InfraWrappableRequest<NodesArgs & SourceArgs>;
export type NodeDetailsMetricData = rt.TypeOf<typeof NodeDetailsMetricDataRT>;
export type NodeDetailsRequest = rt.TypeOf<typeof NodeDetailsRequestRT>;
export type NodeDetailsMetricDataResponse = rt.TypeOf<typeof NodeDetailsMetricDataResponseRT>;
