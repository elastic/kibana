/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

const CertificateDataType = t.partial({
  validFrom: t.number,
  validTo: t.number,
  issuer: t.string,
  subjectName: t.string,
});

const NetworkEventType = t.intersection([
  t.type({
    timestamp: t.string,
    requestSentTime: t.number,
    loadEndTime: t.number,
    url: t.string,
  }),
  t.partial({
    bytesDownloadedCompressed: t.number,
    certificates: CertificateDataType,
    ip: t.string,
    method: t.string,
    status: t.number,
    mimeType: t.string,
    requestStartTime: t.number,
    responseHeaders: t.record(t.string, t.string),
    requestHeaders: t.record(t.string, t.string),
    timings: NetworkTimingsType,
  }),
]);

export type NetworkTimings = t.TypeOf<typeof NetworkTimingsType>;
export type CertificateData = t.TypeOf<typeof CertificateDataType>;
export type NetworkEvent = t.TypeOf<typeof NetworkEventType>;

export const SyntheticsNetworkEventsApiResponseType = t.type({
  events: t.array(NetworkEventType),
  total: t.number,
});

export type SyntheticsNetworkEventsApiResponse = t.TypeOf<
  typeof SyntheticsNetworkEventsApiResponseType
>;
