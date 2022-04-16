/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import { register } from './delete_route';
import { API_BASE_PATH } from '../../../common/constants';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import { httpServerMock, httpServiceMock, coreMock } from '@kbn/core/server/mocks';

import { handleEsError } from '../../shared_imports';

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

describe('DELETE remote clusters', () => {
  let handler: RequestHandler;
  let mockRouteDependencies: ReturnType<typeof createMockRouteDependencies>;
  let mockContext: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let scopedClusterClientMock: ScopedClusterClientMock;

  let remoteInfoMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['remoteInfo'];
  let getSettingsMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['getSettings'];
  let putSettingsMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['putSettings'];

  const createMockRequest = (
    body: Record<string, any> = {
      name: 'test',
      proxyAddress: '127.0.0.1:9300',
      mode: 'proxy',
      skipUnavailable: false,
      serverName: 'foobar',
    }
  ) =>
    httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `${API_BASE_PATH}/{nameOrNames}`,
      params: {
        nameOrNames: 'test',
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
    getSettingsMockFn = scopedClusterClientMock.asCurrentUser.cluster.getSettings;
    putSettingsMockFn = scopedClusterClientMock.asCurrentUser.cluster.putSettings;
    mockRouteDependencies = createMockRouteDependencies();

    register(mockRouteDependencies);
    const [[, handlerFn]] = mockRouteDependencies.router.delete.mock.calls;
    handler = handlerFn;
  });

  describe('success', () => {
    test('deletes remote cluster', async () => {
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
      putSettingsMockFn.mockResponseOnce({
        acknowledged: true,
        persistent: {},
        transient: {},
      });

      const mockRequest = createMockRequest();

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        itemsDeleted: ['test'],
        errors: [],
      });

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: null,
                  skip_unavailable: null,
                  mode: null,
                  proxy_address: null,
                  proxy_socket_connections: null,
                  server_name: null,
                  node_connections: null,
                },
              },
            },
          },
        },
      });
    });
  });

  describe('failure', () => {
    test('returns errors array with 404 error if remote cluster does not exist', async () => {
      getSettingsMockFn.mockResponseOnce({
        persistent: {
          cluster: {
            remote: {},
          },
        },
        transient: {},
      });
      remoteInfoMockFn.mockResponseOnce({});

      const mockRequest = createMockRequest();

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        errors: [
          {
            error: {
              options: {
                body: {
                  message: 'There is no remote cluster with that name.',
                },
                statusCode: 404,
              },
              payload: {
                message: 'There is no remote cluster with that name.',
              },
              status: 404,
            },
            name: 'test',
          },
        ],
        itemsDeleted: [],
      });

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
    });

    test('returns errors array with 400 error if ES still returns cluster information', async () => {
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
        errors: [
          {
            error: {
              options: {
                body: {
                  message: 'Unable to delete cluster, information still returned from ES.',
                },
                statusCode: 400,
              },
              payload: {
                message: 'Unable to delete cluster, information still returned from ES.',
              },
              status: 400,
            },
            name: 'test',
          },
        ],
        itemsDeleted: [],
      });

      expect(getSettingsMockFn).toHaveBeenCalledWith();
      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: null,
                  skip_unavailable: null,
                  mode: null,
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
