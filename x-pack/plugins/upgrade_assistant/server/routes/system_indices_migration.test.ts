/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { handleEsError } from '../shared_imports';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerSystemIndicesMigrationRoutes } from './system_indices_migration';

const mockedResponse = {
  features: [
    {
      feature_name: 'security',
      minimum_index_version: '7.1.1',
      migration_status: 'NO_MIGRATION_NEEDED',
      indices: [
        {
          index: '.security-7',
          version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'kibana',
      minimum_index_version: '7.1.2',
      upgrade_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.kibana',
          version: '7.1.2',
        },
      ],
    },
  ],
  migration_status: 'MIGRATION_NEEDED',
};

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly.
 */
describe('Migrate system indices API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
      lib: { handleEsError },
    };
    registerSystemIndicesMigrationRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/system_indices_migration', () => {
    it('returns system indices migration status', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockResolvedValue(mockedResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/system_indices_migration',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_migration/system_features',
      });
      expect(resp.payload).toEqual({
        ...mockedResponse,
        features: mockedResponse.features.filter(
          (feature) => feature.migration_status !== 'NO_MIGRATION_NEEDED'
        ),
      });
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/system_indices_migration',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });

  describe('POST /api/upgrade_assistant/system_indices_migration', () => {
    it('returns system indices migration status', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockResolvedValue(mockedResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: '/api/upgrade_assistant/system_indices_migration',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_migration/system_features',
      });
      expect(resp.payload).toEqual(mockedResponse);
    });

    it('returns an error if it throws', async () => {
      (
        routeHandlerContextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as jest.Mock
      ).mockRejectedValue(new Error('scary error!'));
      await expect(
        routeDependencies.router.getHandler({
          method: 'post',
          pathPattern: '/api/upgrade_assistant/system_indices_migration',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });
});
