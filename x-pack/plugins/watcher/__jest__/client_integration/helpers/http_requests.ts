/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { ROUTES } from '../../../common/constants';

const { API_ROOT } = ROUTES;

type HttpResponse = Record<string, any> | any[];
type HttpMethod = 'GET' | 'PUT' | 'POST';
export interface ResponseError {
  statusCode: number;
  message: string | Error;
}

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) =>
    mockResponses.get(method)?.get(path) ?? Promise.resolve({});

  httpSetup.get.mockImplementation((path) =>
    mockMethodImplementation('GET', path as unknown as string)
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
      .set(path, error ? defuse(Promise.reject(error)) : Promise.resolve(response));
  };

  const setLoadWatchesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_ROOT}/watches`, response, error);

  const setLoadWatchResponse = (watchId: string, response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_ROOT}/watch/${watchId}`, response, error);

  const setLoadWatchHistoryResponse = (
    watchId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_ROOT}/watch/${watchId}/history`, response, error);

  const setLoadWatchHistoryItemResponse = (
    watchId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_ROOT}/watch/history/${watchId}`, response, error);

  const setDeleteWatchResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_ROOT}/watches/delete`, response, error);

  const setSaveWatchResponse = (watchId: string, response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_ROOT}/watch/${watchId}`, response, error);

  const setLoadExecutionResultResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_ROOT}/watch/execute`, response, error);

  const setLoadMatchingIndicesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_ROOT}/indices`, response, error);

  const setLoadEsFieldsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_ROOT}/fields`, response, error);

  const setLoadSettingsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_ROOT}/settings`, response, error);

  const setLoadWatchVisualizeResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_ROOT}/watch/visualize`, response, error);

  const setDeactivateWatchResponse = (
    watchId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_ROOT}/watch/${watchId}/deactivate`, response, error);

  const setActivateWatchResponse = (
    watchId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_ROOT}/watch/${watchId}/activate`, response, error);

  const setAcknowledgeWatchResponse = (
    watchId: string,
    actionId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'PUT',
      `${API_ROOT}/watch/${watchId}/action/${actionId}/acknowledge`,
      response,
      error
    );

  return {
    setLoadWatchesResponse,
    setLoadWatchResponse,
    setLoadWatchHistoryResponse,
    setLoadWatchHistoryItemResponse,
    setDeleteWatchResponse,
    setSaveWatchResponse,
    setLoadExecutionResultResponse,
    setLoadMatchingIndicesResponse,
    setLoadEsFieldsResponse,
    setLoadSettingsResponse,
    setLoadWatchVisualizeResponse,
    setDeactivateWatchResponse,
    setActivateWatchResponse,
    setAcknowledgeWatchResponse,
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
