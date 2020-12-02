/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

const NetworkTimingsType = t.type({
  dns_start: t.number,
  push_end: t.number,
  worker_fetch_start: t.number,
  worker_respond_with_settled: t.number,
  proxy_end: t.number,
  worker_start: t.number,
  worker_ready: t.number,
  send_end: t.number,
  connect_end: t.number,
  connect_start: t.number,
  send_start: t.number,
  proxy_start: t.number,
  push_start: t.number,
  ssl_end: t.number,
  receive_headers_end: t.number,
  ssl_start: t.number,
  request_time: t.number,
  dns_end: t.number,
});

export type NetworkTimings = t.TypeOf<typeof NetworkTimingsType>;

const NetworkEventType = t.intersection([
  t.type({
    timestamp: t.string,
    requestSentTime: t.number,
    loadEndTime: t.number,
  }),
  t.partial({
    method: t.string,
    url: t.string,
    status: t.number,
    mimeType: t.string,
    requestStartTime: t.number,
    timings: NetworkTimingsType,
  }),
]);

export type NetworkEvent = t.TypeOf<typeof NetworkEventType>;

export const SyntheticsNetworkEventsApiResponseType = t.type({
  events: t.array(NetworkEventType),
});

export type SyntheticsNetworkEventsApiResponse = t.TypeOf<
  typeof SyntheticsNetworkEventsApiResponseType
>;
