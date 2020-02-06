/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { register } from './delete_route';
import { API_BASE_PATH } from '../../../common/constants';
import { LicenseStatus } from '../../types';

import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
} from '../../../../../../src/core/server/mocks';

interface TestOptions {
  licenseCheckResult?: LicenseStatus;
  apiResponses?: Array<() => Promise<unknown>>;
  asserts: { statusCode: number; result?: Record<string, any>; apiArguments?: unknown[][] };
  params: {
    nameOrNames: string;
  };
}

describe('DELETE remote clusters', () => {
  const deleteRemoteClustersTest = (
    description: string,
    { licenseCheckResult = { valid: true }, apiResponses = [], asserts, params }: TestOptions
  ) => {
    test(description, async () => {
      const { adminClient: elasticsearchMock } = elasticsearchServiceMock.createSetup();

      const mockRouteDependencies = {
        router: httpServiceMock.createRouter(),
        getLicenseStatus: () => licenseCheckResult,
        elasticsearchService: elasticsearchServiceMock.createInternalSetup(),
        elasticsearch: elasticsearchMock,
      };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();

      elasticsearchServiceMock
        .createClusterClient()
        .asScoped.mockReturnValue(mockScopedClusterClient);

      for (const apiResponse of apiResponses) {
        mockScopedClusterClient.callAsCurrentUser.mockImplementationOnce(apiResponse);
      }

      register(mockRouteDependencies);
      const [[{ validate }, handler]] = mockRouteDependencies.router.delete.mock.calls;

      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: `${API_BASE_PATH}/{nameOrNames}`,
        params: (validate as any).params.validate(params),
        headers: { authorization: 'foo' },
      });

      const mockContext = ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClusterClient,
          },
        },
      } as unknown) as RequestHandlerContext;

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
    deleteRemoteClustersTest('deletes remote cluster', {
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
          persistent: {},
          transient: {},
        }),
      ],
      params: {
        nameOrNames: 'test',
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
                    remote: { test: { seeds: null, skip_unavailable: null } },
                  },
                },
              },
            },
          ],
        ],
        statusCode: 200,
        result: {
          itemsDeleted: ['test'],
          errors: [],
        },
      },
    });
  });

  describe('failure', () => {
    deleteRemoteClustersTest(
      'returns errors array with 404 error if remote cluster does not exist',
      {
        apiResponses: [async () => ({})],
        params: {
          nameOrNames: 'test',
        },
        asserts: {
          apiArguments: [['cluster.remoteInfo']],
          statusCode: 200,
          result: {
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
          },
        },
      }
    );

    deleteRemoteClustersTest(
      'returns errors array with 400 error if ES still returns cluster information',
      {
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
          nameOrNames: 'test',
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
                      remote: { test: { seeds: null, skip_unavailable: null } },
                    },
                  },
                },
              },
            ],
          ],
          statusCode: 200,
          result: {
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
          },
        },
      }
    );
  });
});
