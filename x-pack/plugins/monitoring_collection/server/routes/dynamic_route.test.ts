/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDynamicRoute } from './dynamic_route';
import {
  KibanaRequest,
  KibanaResponseFactory,
  ServiceStatusLevels,
} from '../../../../../src/core/server';
import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

beforeEach(() => {
  jest.resetAllMocks();
});

jest.mock('../lib', () => ({
  getESClusterUuid: () => 'clusterA',
  getKibanaStats: () => ({ name: 'myKibana' }),
}));

describe('dynamic route', () => {
  const kibanaStatsConfig = {
    allowAnonymous: true,
    kibanaIndex: '.kibana',
    kibanaVersion: '8.0.0',
    uuid: 'abc123',
    server: {
      name: 'server',
      hostname: 'host',
      port: 123,
    },
  };

  const getStatus = () => ({
    level: ServiceStatusLevels.available,
    summary: 'Service is working',
  });

  it('returns for a valid type', async () => {
    const router = httpServiceMock.createRouter();

    const getMetric = async () => {
      return { foo: 1 };
    };
    registerDynamicRoute({
      router,
      config: kibanaStatsConfig,
      getStatus,
      getMetric,
    });

    const [_, handler] = router.get.mock.calls[0];

    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    const context = {
      core: {
        elasticsearch: {
          client: esClientMock,
        },
      },
    };
    const req = { params: { type: 'test' } } as KibanaRequest<unknown, unknown, unknown>;
    const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(factory.ok).toHaveBeenCalledWith({
      body: {
        cluster_uuid: 'clusterA',
        kibana: { name: 'myKibana' },
        test: {
          foo: 1,
        },
      },
    });
  });

  it('returns the an empty object if there is no data', async () => {
    const router = httpServiceMock.createRouter();

    const getMetric = async () => {
      return {};
    };
    registerDynamicRoute({ router, config: kibanaStatsConfig, getStatus, getMetric });

    const [_, handler] = router.get.mock.calls[0];

    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    const context = {
      core: {
        elasticsearch: {
          client: esClientMock,
        },
      },
    };
    const req = { params: { type: 'test' } } as KibanaRequest<unknown, unknown, unknown>;
    const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(factory.ok).toHaveBeenCalledWith({
      body: {
        cluster_uuid: 'clusterA',
        kibana: { name: 'myKibana' },
        test: {},
      },
    });
  });
});
