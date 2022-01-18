/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { registerTaskManagerRoute } from './task_manager';
import {
  KibanaRequest,
  KibanaResponseFactory,
  ServiceStatus,
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

describe('rules', () => {
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

  const overallStatus$ = new BehaviorSubject<ServiceStatus>({
    level: ServiceStatusLevels.available,
    summary: 'Service is working',
  });

  it('returns the existing rules', async () => {
    const router = httpServiceMock.createRouter();

    const getMetrics = async () => {
      return {
        pending: 4,
        drift: {
          p50: 1000,
          p99: 4500,
        },
      };
    };
    registerTaskManagerRoute({ router, config: kibanaStatsConfig, overallStatus$, getMetrics });

    const [_, handler] = router.get.mock.calls[0];

    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    const context = {
      core: {
        elasticsearch: {
          client: esClientMock,
        },
      },
    };
    const req = {} as KibanaRequest<unknown, unknown, unknown>;
    const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(factory.ok).toHaveBeenCalledWith({
      body: {
        cluster_uuid: 'clusterA',
        kibana: { name: 'myKibana' },
        task_manager: {
          pending: 4,
          drift: {
            p50: 1000,
            p99: 4500,
          },
        },
      },
    });
  });

  it('returns the an empty object if there are no task manager stats', async () => {
    const router = httpServiceMock.createRouter();

    const getMetrics = async () => {
      return {};
    };
    registerTaskManagerRoute({ router, config: kibanaStatsConfig, overallStatus$, getMetrics });

    const [_, handler] = router.get.mock.calls[0];

    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    const context = {
      core: {
        elasticsearch: {
          client: esClientMock,
        },
      },
    };
    const req = {} as KibanaRequest<unknown, unknown, unknown>;
    const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(factory.ok).toHaveBeenCalledWith({
      body: {
        cluster_uuid: 'clusterA',
        kibana: { name: 'myKibana' },
        task_manager: {},
      },
    });
  });
});
