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

export const GetHostsRequestParamsRT = rt.type({
  metrics: rt.array(rt.type({ type: HostMetricTypeRT })), // TBD
  sortField: rt.string, // TBD
  sortDirection: rt.union([rt.literal('desc'), rt.literal('asc')]),
  sourceId: rt.string,
  query: rt.string,
});

const HostMetricsRT = rt.type({
  name: HostMetricTypeRT,
  value: rt.union([rt.number, rt.null]),
});

const HostMetadataRT = rt.partial({
  // keep the actual field name from the index mappings
  'host.os.name': rt.union([rt.string, rt.null]),
  'cloud.provider': rt.union([rt.string, rt.null]),
});

export const GetHostsRequestResponsePayloadRT = rt.type({
  metrics: HostMetricsRT,
  metadata: HostMetadataRT,
});

export type GetHostsRequestParams = rt.TypeOf<typeof GetHostsRequestParamsRT>;
export type GetHostsResponsePayload = rt.TypeOf<typeof GetHostsRequestResponsePayloadRT>;
