/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon, { SinonFakeServer } from 'sinon';

export type HttpResponse = Record<string, any> | any[];

const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setPoliciesResponse = (response: HttpResponse = []) => {
    server.respondWith('/api/index_lifecycle_management/policies', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setNodesListResponse = (response: HttpResponse = []) => {
    server.respondWith('/api/index_lifecycle_management/nodes/list', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setNodesDetailsResponse = (nodeAttributes: string, response: HttpResponse = []) => {
    server.respondWith(`/api/index_lifecycle_management/nodes/${nodeAttributes}/details`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  return {
    setPoliciesResponse,
    setNodesListResponse,
    setNodesDetailsResponse,
  };
};

export type HttpRequestMockHelpers = ReturnType<typeof registerHttpRequestMockHelpers>;

export const init = () => {
  const server = sinon.fakeServer.create();

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultSinonMockServerResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
