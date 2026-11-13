/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as http from 'http';
import { createServer } from '@mswjs/http-middleware';
import { http as mswHttp, HttpResponse } from 'msw';

export const STS_MOCK_PORT = 8091;
export const STS_MOCK_URL = `http://localhost:${STS_MOCK_PORT}/`;

/** What Kibana forwarded to STS: the headers it kept and the body it sent. */
export interface MockStsRequest {
  headers: Record<string, string>;
  body: string;
}

export type MockStsResponder = (request: MockStsRequest) => Response;

/** A `GetCallerIdentity` response for the given account and principal. */
export const callerIdentityResponse = (account: string, arn: string) =>
  new HttpResponse(
    `<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><GetCallerIdentityResult><UserId>AROAEXAMPLE:fn</UserId><Account>${account}</Account><Arn>${arn}</Arn></GetCallerIdentityResult><ResponseMetadata><RequestId>req-1</RequestId></ResponseMetadata></GetCallerIdentityResponse>`,
    { status: 200, headers: { 'content-type': 'text/xml' } }
  );

/** What STS answers to a signature it does not accept. */
export const signatureRejectedResponse = () =>
  new HttpResponse(
    '<ErrorResponse><Error><Type>Sender</Type><Code>SignatureDoesNotMatch</Code></Error></ErrorResponse>',
    { status: 403, headers: { 'content-type': 'text/xml' } }
  );

export interface MockSts {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Decide what STS answers to the following forwarded requests. */
  setResponder: (responder: MockStsResponder) => void;
  /** Every forwarded request since the last `reset()`. */
  getRequests: () => MockStsRequest[];
  /** Drop recorded requests and restore the given default answer. */
  reset: () => void;
}

/**
 * msw stand-in for `sts.<region>.amazonaws.com`, which Kibana is pointed at through
 * `xpack.fleet.developer.provisioningCallbackStsUrl`. It does not check signatures: the suites
 * use it to decide which account and principal a report is vouched for.
 */
export const createMockSts = (defaultResponder: MockStsResponder): MockSts => {
  const requests: MockStsRequest[] = [];
  let responder = defaultResponder;
  let server: http.Server | undefined;

  const app = createServer(
    mswHttp.post('/', async ({ request }) => {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, name) => {
        headers[name] = value;
      });
      const received = { headers, body: await request.text() };
      requests.push(received);
      return responder(received);
    })
  );

  return {
    start: () =>
      new Promise<void>((resolve, reject) => {
        const listening = app.listen(STS_MOCK_PORT);
        listening.once('listening', () => {
          server = listening;
          resolve();
        });
        listening.once('error', reject);
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        const closing = server;
        server = undefined;
        closing.closeAllConnections();
        closing.close((error) => (error ? reject(error) : resolve()));
      }),
    setResponder: (next) => {
      responder = next;
    },
    getRequests: () => [...requests],
    reset: () => {
      requests.length = 0;
      responder = defaultResponder;
    },
  };
};
