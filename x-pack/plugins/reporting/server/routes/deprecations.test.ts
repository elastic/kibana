/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { of } from 'rxjs';
import { ElasticsearchClient } from 'kibana/server';
import { setupServer } from 'src/core/server/test_utils';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

import { API_MIGRATE_ILM_POLICY_URL } from '../../common/constants';
import { ReportingCore } from '..';
import { ReportingInternalSetup } from '../core';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockReportingCore,
  createMockLevelLogger,
} from '../test_helpers';
import { ReportingRequestHandlerContext } from '../types';

import { registerDeprecationsRoutes } from './deprecations';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;
type MockLogger = ReturnType<typeof createMockLevelLogger>;

const { createApiResponse } = elasticsearchServiceMock;

describe(`PUT ${API_MIGRATE_ILM_POLICY_URL}`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let core: ReportingCore;
  let mockSetupDeps: ReportingInternalSetup;
  let logger: MockLogger;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;

  beforeEach(async () => {
    logger = createMockLevelLogger();
    ({ server, httpSetup, handlerContext } = await setupServer(reportingSymbol));

    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => ({ usesUiCapabilities: jest.fn() })
    );
    mockSetupDeps = createMockPluginSetup({
      security: {
        license: {
          isEnabled: () => true,
        },
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['superuser'],
            username: 'Tom Riddle',
          }),
        },
      },
      router: httpSetup.createRouter(''),
      licensing: {
        license$: of({
          isActive: true,
          isAvailable: true,
          type: 'gold',
        }),
      },
    });

    core = await createMockReportingCore(
      createMockConfigSchema({ roles: { enabled: false } }),
      mockSetupDeps
    );

    mockEsClient = handlerContext.elasticsearch.client.asCurrentUser;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('sends the expected request to Elasticsearch', async () => {
    mockEsClient.indices.putSettings.mockResolvedValueOnce(createApiResponse());
    registerDeprecationsRoutes(core, logger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .put(API_MIGRATE_ILM_POLICY_URL)
      .expect(200)
      .then((response) => {
        expect(response.body).toMatchInlineSnapshot(`Object {}`); // empty body
      });

    expect(mockEsClient.indices.putSettings).toHaveBeenCalledTimes(1);
    expect(mockEsClient.indices.putSettings.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "index": Object {
            "lifecycle": Object {
              "name": "kibana-reporting",
            },
          },
        },
        "index": ".reporting-*",
      }
    `);
  });
});
