/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon, { SinonFakeServer } from 'sinon';

type HttpResponse = Record<string, any> | any[];

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setSimulatePipelineResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('POST', '/api/ingest_pipelines/simulate', [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  return {
    setSimulatePipelineResponse,
  };
};

export const initHttpRequests = () => {
  const server = sinon.fakeServer.create();

  server.respondImmediately = true;

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
