/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { SinonFakeServer } from 'sinon';

import { API_BASE_PATH } from '../../../common/constants';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadPipelinesResponse = (response?: any[], error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? error.body : response;

    server.respondWith('GET', API_BASE_PATH, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadPipelineResponse = (response?: {}, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? error.body : response;

    server.respondWith('GET', `${API_BASE_PATH}/:name`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setDeletePipelineResponse = (response?: object) => {
    server.respondWith('DELETE', `${API_BASE_PATH}/:name`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setCreatePipelineResponse = (response?: object, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('POST', API_BASE_PATH, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  const setParseCsvResponse = (response?: object, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('POST', `${API_BASE_PATH}/parse_csv`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  return {
    setLoadPipelinesResponse,
    setLoadPipelineResponse,
    setDeletePipelineResponse,
    setCreatePipelineResponse,
    setParseCsvResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultMockedResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
