/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { UnwrapPromise } from '@kbn/utility-types';
import supertest from 'supertest';

import { ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import {
  contextServiceMock,
  elasticsearchServiceMock,
  savedObjectsServiceMock,
  executionContextServiceMock,
} from '../../../../../src/core/server/mocks';
import { createHttpServer } from '../../../../../src/core/server/test_utils';
import { registerSettingsRoute } from './settings';

type HttpService = ReturnType<typeof createHttpServer>;
type HttpSetup = UnwrapPromise<ReturnType<HttpService['setup']>>;

export function mockGetClusterInfo(clusterInfo: any) {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  // @ts-ignore we only care about the response body
  esClient.info.mockResolvedValue({ body: { ...clusterInfo } });
  return esClient;
}

describe('/api/settings', () => {
  let server: HttpService;
  let httpSetup: HttpSetup;
  let overallStatus$: BehaviorSubject<ServiceStatus>;

  beforeEach(async () => {
    server = createHttpServer();
    await server.preboot({ context: contextServiceMock.createPrebootContract() });
    httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract({
        core: {
          elasticsearch: {
            client: {
              asCurrentUser: mockGetClusterInfo({ cluster_uuid: 'yyy-yyyyy' }),
            },
          },
          savedObjects: {
            client: savedObjectsServiceMock.create(),
          },
        },
      }),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
    });

    overallStatus$ = new BehaviorSubject<ServiceStatus>({
      level: ServiceStatusLevels.available,
      summary: 'everything is working',
    });

    const usageCollection = {
      getCollectorByType: jest.fn().mockReturnValue({
        fetch: jest
          .fn()
          .mockReturnValue({ xpack: { default_admin_email: 'kibana-machine@elastic.co' } }),
      }),
    } as any;

    const router = httpSetup.createRouter('');
    registerSettingsRoute({
      router,
      overallStatus$,
      usageCollection,
      config: {
        kibanaIndex: '.kibana-test',
        kibanaVersion: '8.8.8-SNAPSHOT',
        server: {
          name: 'mykibana',
          hostname: 'mykibana.com',
          port: 1234,
        },
        uuid: 'xxx-xxxxx',
      },
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('successfully returns data', async () => {
    const response = await supertest(httpSetup.server.listener).get('/api/settings').expect(200);
    expect(response.body).toMatchObject({
      cluster_uuid: 'yyy-yyyyy',
      settings: {
        xpack: {
          default_admin_email: 'kibana-machine@elastic.co',
        },
        kibana: {
          uuid: 'xxx-xxxxx',
          name: 'mykibana',
          index: '.kibana-test',
          host: 'mykibana.com',
          locale: 'en',
          transport_address: `mykibana.com:1234`,
          version: '8.8.8',
          snapshot: true,
          status: 'green',
        },
      },
    });
  });
});
