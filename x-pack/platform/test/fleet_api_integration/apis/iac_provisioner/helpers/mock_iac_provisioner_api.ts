/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as http from 'http';
import type { RenderIacTemplateResponse } from '@kbn/fleet-plugin/common/types/rest_spec/iac_provisioner';
import { createServer } from '@mswjs/http-middleware';
import { http as mswHttp, HttpResponse } from 'msw';

export const IAC_PROVISIONER_MOCK_PORT = 8090;
export const IAC_PROVISIONER_MOCK_URL = `http://localhost:${IAC_PROVISIONER_MOCK_PORT}`;
/** The endpoint the Fleet IaC Provisioner client POSTs every render to. */
export const IAC_PROVISIONER_RENDER_PATH = '/api/v1/render';

/** What Kibana sent to the provisioner: the body after the client's own mapping. */
export interface MockIacProvisionerRequest {
  url: string;
  method: string;
  body: Record<string, unknown>;
}

export type MockIacProvisionerResponder = (body: Record<string, unknown>) => Response;

export interface MockIacProvisionerResponse {
  status?: number;
  /** The provisioner reply: a full render response, or any JSON body for error cases. */
  body: RenderIacTemplateResponse | Record<string, unknown>;
}

/** A schema-complete `render: false` reply; spread overrides to flip fields per test. */
export const renderResponse = (
  overrides: Partial<RenderIacTemplateResponse> = {}
): RenderIacTemplateResponse => ({
  templateSha: 'sha256:rendered-template',
  render: false,
  blueprint: { id: 'aws-federated-identity', version: '1.0.0' },
  ...overrides,
});

export interface MockIacProvisioner {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Replace the render reply for the following requests (static body or per-request function). */
  setRenderResponse: (response: MockIacProvisionerResponse | MockIacProvisionerResponder) => void;
  /** Every render request received since the last `reset()`. */
  getRequests: () => MockIacProvisionerRequest[];
  /** Drop recorded requests and restore the default `render: false` reply. */
  reset: () => void;
}

const defaultResponder: MockIacProvisionerResponder = () => HttpResponse.json(renderResponse());

/**
 * msw mock of the IaC Provisioner render endpoint. One instance per suite: `start()` in
 * `before`, `stop()` in `after`, `reset()` in `beforeEach` so request assertions only see the
 * current test's traffic.
 */
export const createMockIacProvisioner = (): MockIacProvisioner => {
  const requests: MockIacProvisionerRequest[] = [];
  let responder: MockIacProvisionerResponder = defaultResponder;
  let server: http.Server | undefined;

  const app = createServer(
    mswHttp.post(IAC_PROVISIONER_RENDER_PATH, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      requests.push({ url: new URL(request.url).pathname, method: request.method, body });
      return responder(body);
    })
  );

  return {
    start: () =>
      new Promise<void>((resolve, reject) => {
        const listening = app.listen(IAC_PROVISIONER_MOCK_PORT);
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
        // Close idle keep-alive sockets too so the port is free for the next suite's `start()`.
        closing.closeAllConnections();
        closing.close((error) => (error ? reject(error) : resolve()));
      }),
    setRenderResponse: (response) => {
      if (typeof response === 'function') {
        responder = response;
        return;
      }
      const { status = 200, body } = response;
      responder = () => HttpResponse.json(body, { status });
    },
    getRequests: () => [...requests],
    reset: () => {
      requests.length = 0;
      responder = defaultResponder;
    },
  };
};
