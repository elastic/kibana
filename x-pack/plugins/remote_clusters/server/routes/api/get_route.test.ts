/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { RequestHandler } from '@kbn/core/server';

import { httpServerMock, httpServiceMock, coreMock } from '@kbn/core/server/mocks';

import { kibanaResponseFactory } from '@kbn/core/server';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import { API_BASE_PATH } from '../../../common/constants';

import { handleEsError } from '../../shared_imports';

import { register } from './get_route';
import { ScopedClusterClientMock } from './types';

// Re-implement the mock that was imported directly from `x-pack/mocks`
function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
  };
}

const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};
describe('GET remote clusters', () => {
  let handler: RequestHandler;
  let mockRouteDependencies: ReturnType<typeof createMockRouteDependencies>;
  let mockContext: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let scopedClusterClientMock: ScopedClusterClientMock;

  let remoteInfoMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['remoteInfo'];
  let getSettingsMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['getSettings'];

  const createMockRequest = () =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: API_BASE_PATH,
      headers: { authorization: 'foo' },
    });

  const createMockRouteDependencies = () => ({
    router: httpServiceMock.createRouter(),
    getLicenseStatus: () => ({ valid: true }),
    lib: {
      handleEsError,
    },
    config: {
      isCloudEnabled: false,
    },
  });

  beforeEach(() => {
    mockContext = xpackMocks.createRequestHandlerContext();
    scopedClusterClientMock = mockContext.core.elasticsearch.client;
    remoteInfoMockFn = scopedClusterClientMock.asCurrentUser.cluster.remoteInfo;
    getSettingsMockFn = scopedClusterClientMock.asCurrentUser.cluster.getSettings;
    mockRouteDependencies = createMockRouteDependencies();

    register(mockRouteDependencies);
    const [[, handlerFn]] = mockRouteDependencies.router.get.mock.calls;
    handler = handlerFn;
  });

  describe('success', () => {
    test('returns remote clusters', async () => {
      getSettingsMockFn.mockResponseOnce({
        persistent: {
          cluster: {
            remote: {
              test: {
                seeds: ['127.0.0.1:9300'],
                skip_unavailable: false,
                mode: 'sniff',
              },
            },
          },
        },
        transient: {},
      });
      remoteInfoMockFn.mockResponseOnce({
        test: {
          connected: true,
          mode: 'sniff',
          seeds: ['127.0.0.1:9300'],
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
        },
      });

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual([
        {
          name: 'test',
          seeds: ['127.0.0.1:9300'],
          isConnected: true,
          connectedNodesCount: 1,
          maxConnectionsPerCluster: 3,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          isConfiguredByNode: false,
          mode: 'sniff',
        },
      ]);

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
    });

    test('returns an empty array when ES responds with an empty object', async () => {
      getSettingsMockFn.mockResponseOnce({} as any);
      remoteInfoMockFn.mockResponseOnce({} as any);

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual([]);

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
    });
  });

  describe('failure', () => {
    const error = new errors.ResponseError({
      body: { message: 'test error' },
      statusCode: 406,
      headers: {},
      meta: {} as any,
      warnings: [],
    });

    test('returns an error if failure to get cluster settings', async () => {
      getSettingsMockFn.mockRejectedValueOnce(error);

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(406);
      expect(response.payload).toEqual({
        attributes: {
          causes: undefined,
          error: undefined,
        },
        message: '{"message":"test error"}',
      });

      expect(getSettingsMockFn).toHaveBeenCalled();
      expect(remoteInfoMockFn).not.toHaveBeenCalled();
    });

    test('returns an error if failure to get cluster remote info', async () => {
      getSettingsMockFn.mockResponseOnce({
        persistent: {
          cluster: {
            remote: {
              test: {
                seeds: ['127.0.0.1:9300'],
                skip_unavailable: false,
                mode: 'sniff',
              },
            },
          },
        },
        transient: {},
      });

      remoteInfoMockFn.mockRejectedValueOnce(error);

      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: API_BASE_PATH,
        headers: { authorization: 'foo' },
      });

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(406);

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
    });
  });
});
