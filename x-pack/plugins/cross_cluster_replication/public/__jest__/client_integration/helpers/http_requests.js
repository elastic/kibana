/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { API_BASE_PATH } from '../../../../common/constants';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (httpSetup) => {
  const mockResponses = new Map(
    ['GET', 'PUT', 'DELETE', 'POST'].map((method) => [method, new Map()])
  );

  const mockMethodImplementation = (method, path) => {
    return mockResponses.get(method)?.get(path) ?? Promise.resolve({});
  };

  httpSetup.get.mockImplementation((path) => mockMethodImplementation('GET', path));
  httpSetup.delete.mockImplementation((path) => mockMethodImplementation('DELETE', path));
  httpSetup.post.mockImplementation((path) => mockMethodImplementation('POST', path));
  httpSetup.put.mockImplementation((path) => mockMethodImplementation('PUT', path));

  const mockResponse = (method, path, response, error) => {
    const defuse = (promise) => {
      promise.catch(() => {});
      return promise;
    };

    return mockResponses
      .get(method)
      .set(path, error ? defuse(Promise.reject({ body: error })) : Promise.resolve(response));
  };

  const setLoadFollowerIndicesResponse = (response, error) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/follower_indices`,
      {
        indices: [],
        ...response,
      },
      error
    );

  const setLoadAutoFollowPatternsResponse = (response, error) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/auto_follow_patterns`,
      {
        patterns: [],
        ...response,
      },
      error
    );

  const setDeleteAutoFollowPatternResponse = (autoFollowId, response, error) =>
    mockResponse(
      'DELETE',
      `${API_BASE_PATH}/auto_follow_patterns/${autoFollowId}`,
      {
        errors: [],
        itemsDeleted: [],
        ...response,
      },
      error
    );

  const setAutoFollowStatsResponse = (response, error) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/stats/auto_follow`,
      {
        numberOfFailedFollowIndices: 0,
        numberOfFailedRemoteClusterStateRequests: 0,
        numberOfSuccessfulFollowIndices: 0,
        recentAutoFollowErrors: [],
        autoFollowedClusters: [
          {
            clusterName: 'new-york',
            timeSinceLastCheckMillis: 13746,
            lastSeenMetadataVersion: 22,
          },
        ],
        ...response,
      },
      error
    );

  const setLoadRemoteClustersResponse = (response = [], error) =>
    mockResponse('GET', '/api/remote_clusters', response, error);

  const setGetAutoFollowPatternResponse = (patternId, response = {}, error) =>
    mockResponse('GET', `${API_BASE_PATH}/auto_follow_patterns/${patternId}`, response, error);

  const setGetClusterIndicesResponse = (response = [], error) =>
    mockResponse('GET', '/api/index_management/indices', response, error);

  const setGetFollowerIndexResponse = (patternId, response = {}, error) =>
    mockResponse('GET', `${API_BASE_PATH}/follower_indices/${patternId}`, response, error);

  return {
    setLoadFollowerIndicesResponse,
    setLoadAutoFollowPatternsResponse,
    setDeleteAutoFollowPatternResponse,
    setAutoFollowStatsResponse,
    setLoadRemoteClustersResponse,
    setGetAutoFollowPatternResponse,
    setGetClusterIndicesResponse,
    setGetFollowerIndexResponse,
  };
};

export const init = () => {
  const httpSetup = httpServiceMock.createSetupContract();

  return {
    httpSetup,
    httpRequestsMockHelpers: registerHttpRequestMockHelpers(httpSetup),
  };
};
