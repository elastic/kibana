/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';

import { API_BASE_PATH } from '../../../common/constants';
import {
  CloudBackupStatus,
  ESUpgradeStatus,
  DeprecationLoggingStatus,
  ResponseError,
} from '../../../common/types';

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>,
  shouldDelayResponse: () => boolean
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    const responsePromise = mockResponses.get(method)?.get(path) ?? Promise.resolve({});
    if (shouldDelayResponse()) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(responsePromise), 1000);
      });
    }

    return responsePromise;
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

  const setLoadCloudBackupStatusResponse = (response?: CloudBackupStatus, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/cloud_backup_status`, response, error);

  const setLoadEsDeprecationsResponse = (response?: ESUpgradeStatus, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/es_deprecations`, response, error);

  const setLoadDeprecationLoggingResponse = (
    response?: DeprecationLoggingStatus,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/deprecation_logging`, response, error);

  const setLoadDeprecationLogsCountResponse = (
    response?: { count: number },
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/deprecation_logging/count`, response, error);

  const setDeleteLogsCacheResponse = (response?: string, error?: ResponseError) =>
    mockResponse('DELETE', `${API_BASE_PATH}/deprecation_logging/cache`, response, error);

  const setUpdateDeprecationLoggingResponse = (
    response?: DeprecationLoggingStatus,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_BASE_PATH}/deprecation_logging`, response, error);

  const setUpdateIndexSettingsResponse = (
    indexName: string,
    response?: object,
    error?: ResponseError
  ) => mockResponse('POST', `${API_BASE_PATH}/${indexName}/index_settings`, response, error);

  const setUpgradeMlSnapshotResponse = (response?: object, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/ml_snapshots`, response, error);

  const setUpgradeMlSnapshotStatusResponse = (
    response?: Record<string, unknown>,
    error?: ResponseError
  ) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/ml_snapshots/${response?.jobId}/${response?.snapshotId}`,
      response,
      error
    );

  const setReindexStatusResponse = (
    indexName: string,
    response?: Record<string, any>,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/reindex/${indexName}`, response, error);

  const setStartReindexingResponse = (
    indexName: string,
    response?: object,
    error?: ResponseError
  ) => mockResponse('POST', `${API_BASE_PATH}/reindex/${indexName}`, response, error);

  const setDeleteMlSnapshotResponse = (
    jobId: string,
    snapshotId: string,
    response?: object,
    error?: ResponseError
  ) =>
    mockResponse('DELETE', `${API_BASE_PATH}/ml_snapshots/${jobId}/${snapshotId}`, response, error);

  const setLoadSystemIndicesMigrationStatus = (response?: object, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/system_indices_migration`, response, error);

  const setLoadMlUpgradeModeResponse = (response?: object, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/ml_upgrade_mode`, response, error);

  const setSystemIndicesMigrationResponse = (response?: object, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/system_indices_migration`, response, error);

  const setGetUpgradeStatusResponse = (response?: object, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/status`, response, error);

  const setLoadRemoteClustersResponse = (response?: object, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/remote_clusters`, response, error);

  return {
    setLoadCloudBackupStatusResponse,
    setLoadEsDeprecationsResponse,
    setLoadDeprecationLoggingResponse,
    setUpdateDeprecationLoggingResponse,
    setUpdateIndexSettingsResponse,
    setUpgradeMlSnapshotResponse,
    setDeleteMlSnapshotResponse,
    setUpgradeMlSnapshotStatusResponse,
    setLoadDeprecationLogsCountResponse,
    setLoadSystemIndicesMigrationStatus,
    setSystemIndicesMigrationResponse,
    setDeleteLogsCacheResponse,
    setStartReindexingResponse,
    setReindexStatusResponse,
    setLoadMlUpgradeModeResponse,
    setGetUpgradeStatusResponse,
    setLoadRemoteClustersResponse,
  };
};

export const init = () => {
  let isResponseDelayed = false;
  const getDelayResponse = () => isResponseDelayed;
  const setDelayResponse = (shouldDelayResponse: boolean) => {
    isResponseDelayed = shouldDelayResponse;
  };

  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup, getDelayResponse);

  return {
    setDelayResponse,
    httpSetup,
    httpRequestsMockHelpers,
  };
};
