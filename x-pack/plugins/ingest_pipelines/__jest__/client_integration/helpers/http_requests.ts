/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { API_BASE_PATH } from '../../../common/constants';

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';
export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: Record<string, any>;
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

  const mockMethodImplementation = (method: HttpMethod, path: string) =>
    mockResponses.get(method)?.get(path) ?? Promise.resolve({});

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

  const setLoadPipelinesResponse = (response?: object[], error?: ResponseError) =>
    mockResponse('GET', API_BASE_PATH, response, error);

  const setLoadPipelineResponse = (
    pipelineName: string,
    response?: object,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/${pipelineName}`, response, error);

  const setDeletePipelineResponse = (
    pipelineName: string,
    response?: object,
    error?: ResponseError
  ) => mockResponse('DELETE', `${API_BASE_PATH}/${pipelineName}`, response, error);

  const setCreatePipelineResponse = (response?: object, error?: ResponseError) =>
    mockResponse('POST', API_BASE_PATH, response, error);

  return {
    setLoadPipelinesResponse,
    setLoadPipelineResponse,
    setDeletePipelineResponse,
    setCreatePipelineResponse,
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
