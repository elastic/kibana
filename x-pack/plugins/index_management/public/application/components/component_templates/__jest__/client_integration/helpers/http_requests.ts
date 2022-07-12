/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH } from './constants';

type HttpResponse = Record<string, any> | any[];
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

  const setGetComponentTemplateDatastream = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/component_templates/${templateId}/datastreams`,
      response,
      error
    );

  const setLoadComponentTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/component_templates`, response, error);

  const setLoadComponentTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/component_templates/${templateId}`, response, error);

  const setDeleteComponentTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse('DELETE', `${API_BASE_PATH}/component_templates/${templateId}`, response, error);

  const setCreateComponentTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/component_templates`, response, error);

  const setPostDatastreamMappingsFromTemplate = (
    name: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'POST',
      `${API_BASE_PATH}/data_streams/${name}/mappings_from_template`,
      response,
      error
    );

  return {
    setLoadComponentTemplatesResponse,
    setDeleteComponentTemplateResponse,
    setLoadComponentTemplateResponse,
    setCreateComponentTemplateResponse,
    setGetComponentTemplateDatastream,
    setPostDatastreamMappingsFromTemplate,
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
