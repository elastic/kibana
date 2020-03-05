/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { register } from './get_route';
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
}

describe('GET remote clusters', () => {
  const getRemoteClustersTest = (
    description: string,
    { licenseCheckResult = { valid: true }, apiResponses = [], asserts }: TestOptions
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
      const [[, handler]] = mockRouteDependencies.router.get.mock.calls;

      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: API_BASE_PATH,
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
    getRemoteClustersTest('returns remote clusters', {
      apiResponses: [
        async () => ({
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: false,
                },
              },
            },
          },
          transient: {},
        }),
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
      ],
      asserts: {
        apiArguments: [['cluster.getSettings'], ['cluster.remoteInfo']],
        statusCode: 200,
        result: [
          {
            name: 'test',
            seeds: ['127.0.0.1:9300'],
            isConnected: true,
            connectedNodesCount: 1,
            maxConnectionsPerCluster: 3,
            initialConnectTimeout: '30s',
            skipUnavailable: false,
            isConfiguredByNode: false,
          },
        ],
      },
    });
    getRemoteClustersTest('returns an empty array when ES responds with an empty object', {
      apiResponses: [async () => ({}), async () => ({})],
      asserts: {
        apiArguments: [['cluster.getSettings'], ['cluster.remoteInfo']],
        statusCode: 200,
        result: [],
      },
    });
  });

  describe('failure', () => {
    const error = Boom.notAcceptable('test error');

    getRemoteClustersTest('returns an error if failure to get cluster settings', {
      apiResponses: [
        async () => {
          throw error;
        },
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
      ],
      asserts: {
        apiArguments: [['cluster.getSettings']],
        statusCode: 500,
        result: error,
      },
    });

    getRemoteClustersTest('returns an error if failure to get cluster remote info', {
      apiResponses: [
        async () => ({
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: false,
                },
              },
            },
          },
          transient: {},
        }),
        async () => {
          throw error;
        },
      ],
      asserts: {
        apiArguments: [['cluster.getSettings'], ['cluster.remoteInfo']],
        statusCode: 500,
        result: error,
      },
    });
  });
});
