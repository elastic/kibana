/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RequestHandler } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';

import { httpServerMock, httpServiceMock, coreMock } from '@kbn/core/server/mocks';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import { API_BASE_PATH } from '../../../common/constants';

import { handleEsError } from '../../shared_imports';

import { register } from './update_route';
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

describe('UPDATE remote clusters', () => {
  let handler: RequestHandler;
  let mockRouteDependencies: ReturnType<typeof createMockRouteDependencies>;
  let mockContext: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let scopedClusterClientMock: ScopedClusterClientMock;

  let remoteInfoMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['remoteInfo'];
  let putSettingsMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['putSettings'];

  const createMockRequest = (
    body: Record<string, any> = { seeds: ['127.0.0.1:9300'], skipUnavailable: true, mode: 'sniff' }
  ) =>
    httpServerMock.createKibanaRequest({
      method: 'put',
      path: `${API_BASE_PATH}/{name}`,
      params: {
        name: 'test',
      },
      body,
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
    putSettingsMockFn = scopedClusterClientMock.asCurrentUser.cluster.putSettings;
    mockRouteDependencies = createMockRouteDependencies();

    register(mockRouteDependencies);
    const [[, handlerFn]] = mockRouteDependencies.router.put.mock.calls;
    handler = handlerFn;
  });

  describe('success', () => {
    test('updates remote cluster', async () => {
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
      putSettingsMockFn.mockResponseOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test: {
                connected: true,
                mode: 'sniff',
                seeds: ['127.0.0.1:9300'],
                num_nodes_connected: 1,
                max_connections_per_cluster: 3,
                initial_connect_timeout: '30s',
                skip_unavailable: true,
              },
            },
          },
        },
        transient: {},
      });

      const mockRequest = createMockRequest();

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        connectedNodesCount: 1,
        initialConnectTimeout: '30s',
        isConfiguredByNode: false,
        isConnected: true,
        maxConnectionsPerCluster: 3,
        name: 'test',
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: true,
        mode: 'sniff',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: true,
                  mode: 'sniff',
                  node_connections: null,
                  proxy_address: null,
                  proxy_socket_connections: null,
                  server_name: null,
                },
              },
            },
          },
        },
      });
    });

    test('updates v1 proxy cluster', async () => {
      remoteInfoMockFn.mockResponseOnce({
        // @ts-expect-error not full interface
        test: {
          connected: true,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          seeds: ['127.0.0.1:9300'],
          max_connections_per_cluster: 20,
          num_nodes_connected: 1,
        },
      });
      putSettingsMockFn.mockResponseOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test: {
                connected: true,
                proxy_address: '127.0.0.1:9300',
                initial_connect_timeout: '30s',
                skip_unavailable: true,
                mode: 'proxy',
                proxy_socket_connections: 18,
              },
            },
          },
        },
        transient: {},
      });

      const mockRequest = createMockRequest({
        proxyAddress: '127.0.0.1:9300',
        skipUnavailable: true,
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        serverName: '',
        proxySocketConnections: 18,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        initialConnectTimeout: '30s',
        isConfiguredByNode: false,
        isConnected: true,
        proxyAddress: '127.0.0.1:9300',
        name: 'test',
        skipUnavailable: true,
        mode: 'proxy',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  proxy_address: '127.0.0.1:9300',
                  skip_unavailable: true,
                  mode: 'proxy',
                  node_connections: null,
                  seeds: null,
                  proxy_socket_connections: 18,
                  server_name: null,
                  proxy: null,
                },
              },
            },
          },
        },
      });
    });
  });

  describe('failure', () => {
    test('returns 404 if remote cluster does not exist', async () => {
      remoteInfoMockFn.mockResponseOnce({} as any);

      const mockRequest = createMockRequest({
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: false,
        mode: 'sniff',
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({
        message: 'There is no remote cluster with that name.',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).not.toHaveBeenCalled();
    });

    test('returns 400 if ES did not acknowledge remote cluster', async () => {
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
      putSettingsMockFn.mockResponseOnce({} as any);

      const mockRequest = createMockRequest({
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: false,
        mode: 'sniff',
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({
        message: 'Unable to edit cluster, no response returned from ES.',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: false,
                  mode: 'sniff',
                  node_connections: null,
                  proxy_address: null,
                  proxy_socket_connections: null,
                  server_name: null,
                },
              },
            },
          },
        },
      });
    });
  });
});
