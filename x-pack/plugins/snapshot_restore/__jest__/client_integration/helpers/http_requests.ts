/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH } from '../../../common';

type HttpMethod = 'GET' | 'PUT' | 'POST';
type HttpResponse = Record<string, any> | any[];

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
      .set(path, error ? defuse(Promise.reject({ body: error })) : Promise.resolve(response));
  };

  const setLoadRepositoriesResponse = (
    response: HttpResponse = { repositories: [] },
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}repositories`, response, error);

  const setLoadRepositoryTypesResponse = (response: HttpResponse = [], error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}repository_types`, response, error);

  const setGetRepositoryResponse = (
    repositoryName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}repositories/${repositoryName}`, response, error);

  const setSaveRepositoryResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_BASE_PATH}repositories`, response, error);

  const setLoadSnapshotsResponse = (response?: HttpResponse, error?: ResponseError) => {
    const defaultResponse = { errors: {}, snapshots: [], repositories: [], total: 0 };
    return mockResponse('GET', `${API_BASE_PATH}snapshots`, response ?? defaultResponse, error);
  };

  const setGetSnapshotResponse = (
    repositoryName: string,
    snapshotName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}snapshots/${repositoryName}/${snapshotName}`,
      response,
      error
    );

  const setLoadIndicesResponse = (
    response: HttpResponse = { indices: [] },
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}policies/indices`, response, error);

  const setAddPolicyResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}policies`, response, error);

  const setCleanupRepositoryResponse = (
    repositoryName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse('POST', `${API_BASE_PATH}repositories/${repositoryName}/cleanup`, response, error);

  const setGetPolicyResponse = (
    policyName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}policy/${policyName}`, response, error);

  const setRestoreSnapshotResponse = (
    repositoryName: string,
    snapshotId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'POST',
      `${API_BASE_PATH}restore/${repositoryName}/${snapshotId}`,
      response,
      error
    );

  return {
    setLoadRepositoriesResponse,
    setLoadRepositoryTypesResponse,
    setGetRepositoryResponse,
    setSaveRepositoryResponse,
    setLoadSnapshotsResponse,
    setGetSnapshotResponse,
    setLoadIndicesResponse,
    setAddPolicyResponse,
    setGetPolicyResponse,
    setCleanupRepositoryResponse,
    setRestoreSnapshotResponse,
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
