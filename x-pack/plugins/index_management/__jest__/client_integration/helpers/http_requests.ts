/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { API_BASE_PATH } from '../../../common/constants';

type HttpResponse = Record<string, any> | any[];
type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

export interface ResponseError {
  status: number;
  error: string;
  message: string;
}

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    return mockResponses.get(method)?.get(path) ?? Promise.resolve({});
  };

  httpSetup.get.mockImplementation((path) =>
    mockMethodImplementation('GET', path as unknown as string)
  );
  httpSetup.delete.mockImplementation((path) =>
    mockMethodImplementation('DELETE', path as unknown as string)
  );
  httpSetup.post.mockImplementation((path) =>
    mockMethodImplementation('POST', path as unknown as string)
  );
  httpSetup.put.mockImplementation((path) =>
    mockMethodImplementation('PUT', path as unknown as string)
  );

  const mockResponse = (method: HttpMethod, path: string, response?: unknown, error?: unknown) => {
    const defuse = (promise: Promise<unknown>) => {
      promise.catch(() => {});
      return promise;
    };

    return mockResponses
      .get(method)!
      .set(path, error ? defuse(Promise.reject({ body: error })) : Promise.resolve(response));
  };

  const setLoadTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/index_templates`, response, error);

  const setLoadIndicesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/indices`, response, error);

  const setReloadIndicesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/indices/reload`, response, error);

  const setLoadDataStreamsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/data_streams`, response, error);

  const setLoadDataStreamResponse = (
    dataStreamId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/data_streams/${encodeURIComponent(dataStreamId)}`,
      response,
      error
    );

  const setDeleteDataStreamResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/delete_data_streams`, response, error);

  const setDeleteTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/delete_index_templates`, response, error);

  const setLoadTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/index_templates/${templateId}`, response, error);

  const setCreateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates`, response, error);

  const setUpdateTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_BASE_PATH}/index_templates/${templateId}`, response, error);

  const setUpdateIndexSettingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_BASE_PATH}/settings/${indexName}`, response, error);

  const setSimulateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates/simulate`, response, error);

  const setLoadComponentTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/component_templates`, response, error);

  const setLoadNodesPluginsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/nodes/plugins`, response, error);

  const setLoadTelemetryResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', '/api/ui_counters/_report', response, error);

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
    setLoadTelemetryResponse,
  };
};

export const init = () => {
  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup);

  return {
    httpSetup,
    httpRequestsMockHelpers,
  };
};
