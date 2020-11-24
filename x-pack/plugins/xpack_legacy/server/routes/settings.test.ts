/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { UnwrapPromise } from '@kbn/utility-types';
import supertest from 'supertest';

import {
  LegacyAPICaller,
  ServiceStatus,
  ServiceStatusLevels,
} from '../../../../../src/core/server';
import {
  contextServiceMock,
  elasticsearchServiceMock,
  savedObjectsServiceMock,
} from '../../../../../src/core/server/mocks';
import { createHttpServer } from '../../../../../src/core/server/test_utils';
import { registerSettingsRoute } from './settings';

type HttpService = ReturnType<typeof createHttpServer>;
type HttpSetup = UnwrapPromise<ReturnType<HttpService['setup']>>;

describe('/api/settings', () => {
  let server: HttpService;
  let httpSetup: HttpSetup;
  let overallStatus$: BehaviorSubject<ServiceStatus>;
  let mockApiCaller: jest.Mocked<LegacyAPICaller>;

  beforeEach(async () => {
    mockApiCaller = jest.fn().mockResolvedValue({ cluster_uuid: 'yyy-yyyyy' });
    server = createHttpServer();
    httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract({
        core: {
          elasticsearch: {
            legacy: {
              client: {
                callAsCurrentUser: mockApiCaller,
              },
            },
            client: {
              asCurrentUser: elasticsearchServiceMock.createScopedClusterClient().asCurrentUser,
            },
          },
          savedObjects: {
            client: savedObjectsServiceMock.create(),
          },
        },
      }),
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
