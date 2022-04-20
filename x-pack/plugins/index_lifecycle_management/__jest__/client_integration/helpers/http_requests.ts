/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH } from '../../../common/constants';
import {
  ListNodesRouteResponse,
  ListSnapshotReposResponse,
  NodesDetailsResponse,
} from '../../../common/types';
import { getDefaultHotPhasePolicy } from '../edit_policy/constants';

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';
export interface ResponseError {
  statusCode: number;
  message: string | Error;
}

export const init = () => {
  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup);

  return {
    httpSetup,
    httpRequestsMockHelpers,
  };
};

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

  const setLoadPolicies = (response: any = [], error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/policies`, response, error);

  const setLoadSnapshotPolicies = (response: any = [], error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/snapshot_policies`, response, error);

  const setListNodes = (response: ListNodesRouteResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/nodes/list`, response, error);

  const setNodesDetails = (
    nodeAttributes: string,
    response: NodesDetailsResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/nodes/${nodeAttributes}/details`, response, error);

  const setListSnapshotRepos = (response: ListSnapshotReposResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/snapshot_repositories`, response, error);

  const setDefaultResponses = () => {
    setLoadPolicies([getDefaultHotPhasePolicy()]);
    setLoadSnapshotPolicies([]);
    setListSnapshotRepos({ repositories: ['abc'] });
    setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
  };

  return {
    setLoadPolicies,
    setLoadSnapshotPolicies,
    setListNodes,
    setNodesDetails,
    setListSnapshotRepos,
    setDefaultResponses,
  };
};
