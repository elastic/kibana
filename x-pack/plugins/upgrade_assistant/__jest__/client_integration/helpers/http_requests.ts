/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { API_BASE_PATH } from '../../common/constants';
import { UpgradeAssistantStatus } from '../../common/types';
import { ResponseError } from '../../public/application/lib/api';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setLoadEsDeprecationsResponse = (
    response?: UpgradeAssistantStatus,
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/status`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadDeprecationLoggingResponse = (
    response?: { isEnabled: boolean },
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('GET', `${API_BASE_PATH}/deprecation_logging`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpdateDeprecationLoggingResponse = (
    response?: { isEnabled: boolean },
    error?: ResponseError
  ) => {
    const status = error ? error.statusCode || 400 : 200;
    const body = error ? error : response;

    server.respondWith('PUT', `${API_BASE_PATH}/deprecation_logging`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setUpdateIndexSettingsResponse = (response?: object) => {
    server.respondWith('POST', `${API_BASE_PATH}/:indexName/index_settings`, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response),
    ]);
  };

  return {
    setLoadEsDeprecationsResponse,
    setLoadDeprecationLoggingResponse,
    setUpdateDeprecationLoggingResponse,
    setUpdateIndexSettingsResponse,
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
