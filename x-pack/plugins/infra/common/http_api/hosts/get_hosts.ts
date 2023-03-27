/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const HostMetricTypeRT = rt.keyof({
  cpu: null,
  diskLatency: null,
  memory: null,
  memoryTotal: null,
  rx: null,
  tx: null,
});

export const HostMetadataTypeRT = rt.keyof({
  'host.os.name': null,
  'cloud.provider': null,
});

export const HostMetricsRT = rt.type({
  name: HostMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

export const HostMetadataRT = rt.partial({
  // keep the actual field name from the index mappings
  name: HostMetadataTypeRT,
  value: rt.union([rt.number, rt.string, rt.null]),
});

export const HostSortFieldRT = rt.union([rt.literal('name'), HostMetricTypeRT]);

export const GetHostsRequestParamsRT = rt.type({
  metrics: rt.array(rt.type({ type: HostMetricTypeRT })),
  query: rt.string,
  sortField: rt.union([HostSortFieldRT, rt.undefined]),
  sortDirection: rt.union([rt.literal('desc'), rt.literal('asc'), rt.undefined]),
  sourceId: rt.string,
});

export const GetHostsRequestResponsePayloadRT = rt.type({
  hosts: rt.array(
    rt.type({
      name: rt.string,
      metrics: rt.array(HostMetricsRT),
      metadata: rt.union([rt.array(HostMetadataRT), rt.null]),
    })
  ),
});

export type HostMetrics = rt.TypeOf<typeof HostMetricsRT>;
export type HostMetadata = rt.TypeOf<typeof HostMetadataRT>;
export type HostMetricType = rt.TypeOf<typeof HostMetricTypeRT>;
export type HostSortField = rt.TypeOf<typeof HostSortFieldRT>;

export type GetHostsRequestParams = rt.TypeOf<typeof GetHostsRequestParamsRT>;
export type GetHostsResponsePayload = rt.TypeOf<typeof GetHostsRequestResponsePayloadRT>;
