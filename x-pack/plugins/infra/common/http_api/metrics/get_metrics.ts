/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiteralValueFromUndefinedRT, inRangeRt, dateRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const MetricTypeRT = rt.keyof({
  cpu: null,
  diskLatency: null,
  memory: null,
  memoryTotal: null,
  rx: null,
  tx: null,
});

export const RangeRT = rt.type({
  from: dateRt,
  to: dateRt,
});

export const MetadataTypeRT = rt.keyof({
  'host.os.name': null,
  'cloud.provider': null,
});

export const MetricsRT = rt.type({
  name: MetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const MetadataRT = rt.type({
  // keep the actual field name from the index mappings
  name: MetadataTypeRT,
  value: rt.union([rt.string, rt.number, rt.null]),
});

export const GetMetricsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    type: rt.literal('host'),
    limit: rt.union([inRangeRt(1, 500), createLiteralValueFromUndefinedRT(20)]),
    metrics: rt.array(rt.type({ type: MetricTypeRT })),
    sourceId: rt.string,
    range: RangeRT,
  }),
]);

export const MetricsItemRT = rt.type({
  name: rt.string,
  metrics: rt.array(MetricsRT),
  metadata: rt.array(MetadataRT),
});

export const GetMetricsResponsePayloadRT = rt.type({
  type: rt.literal('host'),
  nodes: rt.array(MetricsItemRT),
});

export type Metrics = rt.TypeOf<typeof MetricsRT>;
export type Metadata = rt.TypeOf<typeof MetadataRT>;
export type MetricType = rt.TypeOf<typeof MetricTypeRT>;
export type MetricsItem = rt.TypeOf<typeof MetricsItemRT>;

export type GetMetricsRequestBodyPayload = Omit<
  rt.TypeOf<typeof GetMetricsRequestBodyPayloadRT>,
  'limit' | 'range'
> & {
  limit?: number;
  range: {
    from: string;
    to: string;
  };
};
export type GetMetricsResponsePayload = rt.TypeOf<typeof GetMetricsResponsePayloadRT>;
