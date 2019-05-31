/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { ROUTES } from '../../../common/constants';

const { API_ROOT } = ROUTES;

type HttpResponse = Record<string, any> | any[];

const mockResponse = (defaultResponse: HttpResponse, response: HttpResponse) => [
  200,
  { 'Content-Type': 'application/json' },
  JSON.stringify({ ...defaultResponse, ...response }),
];

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadWatchesResponse = (response: HttpResponse = {}) => {
    const defaultResponse = { watches: [] };

    server.respondWith('GET', `${API_ROOT}/watches`, mockResponse(defaultResponse, response));
  };

  const setDeleteWatchResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('POST', `${API_ROOT}/watches/delete`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  return {
    setLoadWatchesResponse,
    setDeleteWatchResponse,
  };
};

export const init = () => {
  const server = sinon.fakeServer.create();
  server.respondImmediately = true;

  // Define default response for unhandled requests.
  // We make requests to APIs which don't impact the component under test, e.g. UI metric telemetry,
  // and we can mock them all with a 200 instead of mocking each one individually.
  server.respondWith([200, {}, 'DefaultResponse']);

  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(server);

  return {
    server,
    httpRequestsMockHelpers,
  };
};
