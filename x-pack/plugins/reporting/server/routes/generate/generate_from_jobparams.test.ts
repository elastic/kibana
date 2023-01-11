/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import { UnwrapPromise } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { of } from 'rxjs';
import { ElasticsearchClient } from 'kibana/server';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import { ExportTypesRegistry } from '../../lib/export_types_registry';
import { createMockLevelLogger, createMockReportingCore } from '../../test_helpers';
import {
  createMockConfigSchema,
  createMockPluginSetup,
} from '../../test_helpers/create_mock_reportingplugin';
import type { ReportingRequestHandlerContext } from '../../types';
import { registerJobGenerationRoutes } from './generate_from_jobparams';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/reporting/generate', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let mockExportTypesRegistry: ExportTypesRegistry;
  let core: ReportingCore;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;

  const config = createMockConfigSchema({
    queue: {
      indexInterval: 'year',
      timeout: 10000,
      pollEnabled: true,
    },
    index: '.reporting',
  });

  const mockLogger = createMockLevelLogger();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => ({ usesUiCapabilities: jest.fn() })
    );

    const mockSetupDeps = createMockPluginSetup({
      security: {
        license: { isEnabled: () => true },
        authc: {
          getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
        },
      },
      router: httpSetup.createRouter(''),
      licensing: { license$: of({ isActive: true, isAvailable: true, type: 'gold' }) },
    });

    core = await createMockReportingCore(config, mockSetupDeps);

    mockExportTypesRegistry = new ExportTypesRegistry();
    mockExportTypesRegistry.register({
      id: 'printablePdf',
      name: 'not sure why this field exists',
      jobType: 'printable_pdf',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
      createJobFnFactory: () => async () => ({ createJobTest: { test1: 'yes' } } as any),
      runTaskFnFactory: () => async () => ({ runParamsTest: { test2: 'yes' } } as any),
    });
    core.getExportTypesRegistry = () => mockExportTypesRegistry;

    mockEsClient = (await core.getEsClient()).asInternalUser as typeof mockEsClient;
    mockEsClient.index.mockResolvedValue({ body: {} } as any);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns 400 if there are no job params', async () => {
    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          '"A jobParams RISON string is required in the querystring or POST body"'
        )
      );
  });

  it('returns 400 if job params query is invalid', async () => {
    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf?jobParams=foo:')
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 if job params body is invalid', async () => {
    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: `foo:` })
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 export type is invalid', async () => {
    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/TonyHawksProSkater2')
      .send({ jobParams: rison.encode({ title: `abc` }) })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot('"Invalid export-type of TonyHawksProSkater2"')
      );
  });

  it('returns 500 if job handler throws an error', async () => {
    mockEsClient.index.mockRejectedValueOnce('silly');

    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: rison.encode({ title: `abc` }) })
      .expect(500);
  });

  it(`returns 200 if job handler doesn't error`, async () => {
    mockEsClient.index.mockResolvedValueOnce({ body: { _id: 'foo', _index: 'foo-index' } } as any);
    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: rison.encode({ title: `abc` }) })
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          job: {
            attempts: 0,
            created_by: 'Tom Riddle',
            id: 'foo',
            index: 'foo-index',
            jobtype: 'printable_pdf',
            payload: {
              createJobTest: {
                test1: 'yes',
              },
            },
            status: 'pending',
          },
          path: 'undefined/api/reporting/jobs/download/foo',
        });
      });
  });
});
