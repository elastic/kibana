/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kibanaResponseFactory } from '../../../../../../src/core/server';
import { register } from './update_route';
import { API_BASE_PATH } from '../../../common/constants';
import { LicenseStatus } from '../../types';

import { xpackMocks } from '../../../../../mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
} from '../../../../../../src/core/server/mocks';

interface TestOptions {
  licenseCheckResult?: LicenseStatus;
  apiResponses?: Array<() => Promise<unknown>>;
  asserts: { statusCode: number; result?: Record<string, any>; apiArguments?: unknown[][] };
  payload?: Record<string, any>;
  params: {
    name: string;
  };
}

describe('UPDATE remote clusters', () => {
  const updateRemoteClustersTest = (
    description: string,
    {
      licenseCheckResult = { valid: true },
      apiResponses = [],
      asserts,
      payload,
      params,
    }: TestOptions
  ) => {
    test(description, async () => {
      const elasticsearchMock = elasticsearchServiceMock.createLegacyClusterClient();

      const mockRouteDependencies = {
        router: httpServiceMock.createRouter(),
        getLicenseStatus: () => licenseCheckResult,
        elasticsearchService: elasticsearchServiceMock.createInternalSetup(),
        elasticsearch: elasticsearchMock,
        config: {
          isCloudEnabled: false,
        },
      };

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();

      elasticsearchServiceMock
        .createLegacyClusterClient()
        .asScoped.mockReturnValue(mockScopedClusterClient);

      for (const apiResponse of apiResponses) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(apiResponse);
      }

      register(mockRouteDependencies);
      const [[{ validate }, handler]] = mockRouteDependencies.router.put.mock.calls;

      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'put',
        path: `${API_BASE_PATH}/{name}`,
        params: (validate as any).params.validate(params),
        body: payload !== undefined ? (validate as any).body.validate(payload) : undefined,
        headers: { authorization: 'foo' },
      });

      const mockContext = xpackMocks.createRequestHandlerContext();
      mockContext.core.elasticsearch.legacy.client = mockScopedClusterClient;
      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (Array.isArray(asserts.apiArguments)) {
        for (const apiArguments of asserts.apiArguments) {
          expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith(...apiArguments);
        }
      } else {
        expect(mockScopedClusterClient.callAsCurrentUser).not.toHaveBeenCalled();
      }
    });
  };

  describe('success', () => {
    updateRemoteClustersTest('updates remote cluster', {
      apiResponses: [
        async () => ({
          test: {
            connected: true,
            mode: 'sniff',
            seeds: ['127.0.0.1:9300'],
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
          },
        }),
        async () => ({
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
        }),
      ],
      params: {
        name: 'test',
      },
      payload: {
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: true,
        mode: 'sniff',
      },
      asserts: {
        apiArguments: [
          ['cluster.remoteInfo'],
          [
            'cluster.putSettings',
            {
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
            },
          ],
        ],
        statusCode: 200,
        result: {
          connectedNodesCount: 1,
          initialConnectTimeout: '30s',
          isConfiguredByNode: false,
          isConnected: true,
          maxConnectionsPerCluster: 3,
          name: 'test',
          seeds: ['127.0.0.1:9300'],
          skipUnavailable: true,
          mode: 'sniff',
        },
      },
    });
    updateRemoteClustersTest('updates v1 proxy cluster', {
      apiResponses: [
        async () => ({
          test: {
            connected: true,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
            seeds: ['127.0.0.1:9300'],
          },
        }),
        async () => ({
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
        }),
      ],
      params: {
        name: 'test',
      },
      payload: {
        proxyAddress: '127.0.0.1:9300',
        skipUnavailable: true,
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        serverName: '',
        proxySocketConnections: 18,
      },
      asserts: {
        apiArguments: [
          ['cluster.remoteInfo'],
          [
            'cluster.putSettings',
            {
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
            },
          ],
        ],
        statusCode: 200,
        result: {
          initialConnectTimeout: '30s',
          isConfiguredByNode: false,
          isConnected: true,
          proxyAddress: '127.0.0.1:9300',
          name: 'test',
          skipUnavailable: true,
          mode: 'proxy',
        },
      },
    });
  });

  describe('failure', () => {
    updateRemoteClustersTest('returns 404 if remote cluster does not exist', {
      apiResponses: [async () => ({})],
      payload: {
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: false,
        mode: 'sniff',
      },
      params: {
        name: 'test',
      },
      asserts: {
        apiArguments: [['cluster.remoteInfo']],
        statusCode: 404,
        result: {
          message: 'There is no remote cluster with that name.',
        },
      },
    });

    updateRemoteClustersTest('returns 400 if ES did not acknowledge remote cluster', {
      apiResponses: [
        async () => ({
          test: {
            connected: true,
            mode: 'sniff',
            seeds: ['127.0.0.1:9300'],
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
          },
        }),
        async () => ({}),
      ],
      payload: {
        seeds: ['127.0.0.1:9300'],
        skipUnavailable: false,
        mode: 'sniff',
      },
      params: {
        name: 'test',
      },
      asserts: {
        apiArguments: [
          ['cluster.remoteInfo'],
          [
            'cluster.putSettings',
            {
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
            },
          ],
        ],
        statusCode: 400,
        result: {
          message: 'Unable to edit cluster, no response returned from ES.',
        },
      },
    });
  });
});
