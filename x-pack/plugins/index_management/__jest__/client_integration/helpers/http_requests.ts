/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { SinonFakeServer } from 'sinon';
import { API_BASE_PATH } from '../../../common/constants';

type HttpResponse = Record<string, any> | any[];

export interface ResponseError {
  status: number;
  error: string;
  message: string;
}

// Register helpers to mock HTTP Requests
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

const registerHttpRequestMockHelpers = (server: SinonFakeServer) => {
  const setResponse = (
    url: string,
    method: string,
    response: HttpResponse = [],
    error?: ResponseError
  ) => {
    const status = error ? error.status || 400 : 200;
    const body = error ?? response;

    server.respondWith(method, `${API_BASE_PATH}${url}`, [
      status,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    ]);
  };

  const setLoadTemplatesResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/index_templates', 'GET', response, error);

  const setLoadIndicesResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/indices', 'GET', response, error);

  const setReloadIndicesResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/indices/reload', 'POST', response, error);

  const setLoadDataStreamsResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/data_streams', 'GET', response, error);

  const setLoadDataStreamResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/data_streams/:id', 'GET', response, error);

  const setDeleteDataStreamResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/delete_data_streams', 'POST', response, error);

  const setDeleteTemplateResponse = (response: HttpResponse, error?: ResponseError) =>
    setResponse('/delete_index_templates', 'POST', response, error);

  const setLoadTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/index_templates/:id', 'GET', response, error);

  const setCreateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/index_templates', 'POST', response, error);

  const setLoadIndexMappingResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/mapping/:name', 'GET', response, error);

  const setLoadIndexStatsResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/stats/:name', 'GET', response, error);

  const setLoadIndexSettingsResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/settings/:name', 'GET', response, error);

  const setUpdateIndexSettingsResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/settings/:name', 'PUT', response, error);

  const setSimulateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/index_templates/simulate', 'POST', response, error);

  const setLoadComponentTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/component_templates', 'GET', response, error);

  const setLoadNodesPluginsResponse = (response?: HttpResponse, error?: ResponseError) =>
    setResponse('/nodes/plugins', 'GET', response, error);

  return {
    setLoadTemplatesResponse,
    setLoadIndicesResponse,
    setReloadIndicesResponse,
    setLoadDataStreamsResponse,
    setLoadDataStreamResponse,
    setDeleteDataStreamResponse,
    setDeleteTemplateResponse,
    setLoadTemplateResponse,
    setCreateTemplateResponse,
    setLoadIndexSettingsResponse,
    setLoadIndexMappingResponse,
    setLoadIndexStatsResponse,
    setUpdateIndexSettingsResponse,
    setSimulateTemplateResponse,
    setLoadComponentTemplatesResponse,
    setLoadNodesPluginsResponse,
  };
};
