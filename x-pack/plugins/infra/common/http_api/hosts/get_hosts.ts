/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLiteralValueFromUndefinedRT, inRangeRT } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';

export const HostMetricTypeRT = rt.keyof({
  cpu: null,
  diskLatency: null,
  memory: null,
  memoryTotal: null,
  rx: null,
  tx: null,
});

export const TimerangeRT = rt.type({
  from: rt.number,
  to: rt.number,
});

export const HostMetadataTypeRT = rt.keyof({
  'host.os.name': null,
  'cloud.provider': null,
});

export const HostMetricsRT = rt.type({
  name: HostMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const HostMetadataRT = rt.type({
  // keep the actual field name from the index mappings
  name: HostMetadataTypeRT,
  value: rt.union([rt.string, rt.number, rt.null]),
});

export const HostSortFieldRT = rt.keyof({ name: null, ...HostMetricTypeRT.keys });

export const GetHostsRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    sortField: HostSortFieldRT,
    sortDirection: rt.union([rt.literal('desc'), rt.literal('asc')]),
    query: rt.UnknownRecord,
  }),
  rt.type({
    limit: rt.union([inRangeRT(1, 10), createLiteralValueFromUndefinedRT(10)]),
    metrics: rt.array(rt.type({ type: HostMetricTypeRT })),
    sourceId: rt.string,
    timeRange: TimerangeRT,
  }),
]);

export const HostMetricsItemRT = rt.type({
  name: rt.string,
  metrics: rt.array(HostMetricsRT),
  metadata: rt.array(HostMetadataRT),
});

export const GetHostsResponsePayloadRT = rt.type({
  hosts: rt.array(HostMetricsItemRT),
});

export type HostMetrics = rt.TypeOf<typeof HostMetricsRT>;
export type HostMetadata = rt.TypeOf<typeof HostMetadataRT>;
export type HostMetricType = rt.TypeOf<typeof HostMetricTypeRT>;
export type HostMetricsItem = rt.TypeOf<typeof HostMetricsItemRT>;

export type GetHostsRequestBodyPayload = Omit<
  rt.TypeOf<typeof GetHostsRequestBodyPayloadRT>,
  'limit'
> & {
  limit: number;
};
export type GetHostsResponsePayload = rt.TypeOf<typeof GetHostsResponsePayloadRT>;
