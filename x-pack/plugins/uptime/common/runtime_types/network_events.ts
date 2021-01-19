/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

const NetworkTimingsType = t.type({
  queueing: t.number,
  connect: t.number,
  total: t.number,
  send: t.number,
  blocked: t.number,
  receive: t.number,
  wait: t.number,
  dns: t.number,
  proxy: t.number,
  ssl: t.number,
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
  total: t.number,
});

export type SyntheticsNetworkEventsApiResponse = t.TypeOf<
  typeof SyntheticsNetworkEventsApiResponseType
>;
