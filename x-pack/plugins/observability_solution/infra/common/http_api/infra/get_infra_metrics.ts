/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiteralValueFromUndefinedRT, inRangeRt, dateRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const InfraMetricTypeRT = rt.keyof({
  cpu: null,
  normalizedLoad1m: null,
  diskSpaceUsage: null,
  memory: null,
  memoryFree: null,
  rx: null,
  tx: null,
});

export const RangeRT = rt.type({
  from: dateRt,
  to: dateRt,
});

export const InfraAssetMetadataTypeRT = rt.keyof({
  'cloud.provider': null,
  'host.ip': null,
  'host.os.name': null,
});

export const InfraAssetMetricsRT = rt.type({
  name: InfraMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const InfraAssetMetadataRT = rt.type({
  // keep the actual field name from the index mappings
  name: InfraAssetMetadataTypeRT,
  value: rt.union([rt.number, rt.string, rt.null]),
});

export const GetInfraMetricsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    type: rt.literal('host'),
    limit: rt.union([inRangeRt(1, 500), createLiteralValueFromUndefinedRT(20)]),
    metrics: rt.array(rt.type({ type: InfraMetricTypeRT })),
    sourceId: rt.string,
    range: RangeRT,
  }),
]);

export const InfraAssetMetricsItemRT = rt.intersection([
  rt.type({
    name: rt.string,
    metrics: rt.array(InfraAssetMetricsRT),
    metadata: rt.array(InfraAssetMetadataRT),
  }),
  rt.partial({
    alertsCount: rt.number,
  }),
]);

export const GetInfraMetricsResponsePayloadRT = rt.type({
  type: rt.literal('host'),
  nodes: rt.array(InfraAssetMetricsItemRT),
});

export type InfraAssetMetrics = rt.TypeOf<typeof InfraAssetMetricsRT>;
export type InfraAssetMetadata = rt.TypeOf<typeof InfraAssetMetadataRT>;
export type InfraAssetMetadataType = rt.TypeOf<typeof InfraAssetMetadataTypeRT>;
export type InfraAssetMetricType = rt.TypeOf<typeof InfraMetricTypeRT>;
export type InfraAssetMetricsItem = rt.TypeOf<typeof InfraAssetMetricsItemRT>;

export type GetInfraMetricsRequestBodyPayload = Omit<
  rt.TypeOf<typeof GetInfraMetricsRequestBodyPayloadRT>,
  'limit' | 'range'
> & {
  limit?: number;
  range: {
    from: string;
    to: string;
  };
};
export type GetInfraMetricsResponsePayload = rt.TypeOf<typeof GetInfraMetricsResponsePayloadRT>;
