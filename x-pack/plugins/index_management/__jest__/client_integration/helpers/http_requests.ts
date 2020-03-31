/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { API_BASE_PATH } from '../../../common/constants';

type HttpResponse = Record<string, any> | any[];

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadTemplatesResponse = (response: HttpResponse = []) => {
    server.respondWith('GET', `${API_BASE_PATH}/templates`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setLoadIndicesResponse = (response: HttpResponse = []) => {
    server.respondWith('GET', `${API_BASE_PATH}/indices`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setDeleteTemplateResponse = (response: HttpResponse = []) => {
    server.respondWith('DELETE', `${API_BASE_PATH}/templates`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  const setLoadTemplateResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? error.body : response;

    server.respondWith('GET', `${API_BASE_PATH}/templates/:id`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setCreateTemplateResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.body.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('PUT', `${API_BASE_PATH}/templates`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  const setUpdateTemplateResponse = (response?: HttpResponse, error?: any) => {
    const status = error ? error.status || 400 : 200;
    const body = error ? JSON.stringify(error.body) : JSON.stringify(response);

    server.respondWith('PUT', `${API_BASE_PATH}/templates/:name`, [
      status,
      { 'Content-Type': 'application/json' },
      body,
    ]);
  };

  return {
    setLoadTemplatesResponse,
    setLoadIndicesResponse,
    setDeleteTemplateResponse,
    setLoadTemplateResponse,
    setCreateTemplateResponse,
    setUpdateTemplateResponse,
  };
};

export const init = () => {
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
