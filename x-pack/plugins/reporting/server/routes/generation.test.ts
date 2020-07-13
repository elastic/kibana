/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import { of } from 'rxjs';
import sinon from 'sinon';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '..';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { createMockReportingCore } from '../test_helpers';
import { createMockLevelLogger } from '../test_helpers/create_mock_levellogger';
import { registerJobGenerationRoutes } from './generation';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/reporting/generate', () => {
  const reportingSymbol = Symbol('reporting');
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let mockExportTypesRegistry: ExportTypesRegistry;
  let callClusterStub: any;
  let core: ReportingCore;

  const config = {
    get: jest.fn().mockImplementation((...args) => {
      const key = args.join('.');
      switch (key) {
        case 'queue.indexInterval':
          return 'year';
        case 'queue.timeout':
          return 10000;
        case 'index':
          return '.reporting';
        case 'queue.pollEnabled':
          return false;
        default:
          return;
      }
    }),
    kbnConfig: { get: jest.fn() },
  };
  const mockLogger = createMockLevelLogger();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext(reportingSymbol, 'reporting', () => ({}));

    callClusterStub = sinon.stub().resolves({});

    const mockSetupDeps = ({
      elasticsearch: {
        legacy: { client: { callAsInternalUser: callClusterStub } },
      },
      security: {
        license: { isEnabled: () => true },
        authc: {
          getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
        },
      },
      router: httpSetup.createRouter(''),
      licensing: { license$: of({ isActive: true, isAvailable: true, type: 'gold' }) },
    } as unknown) as any;

    core = await createMockReportingCore(config, mockSetupDeps);

    mockExportTypesRegistry = new ExportTypesRegistry();
    mockExportTypesRegistry.register({
      id: 'printablePdf',
      name: 'not sure why this field exists',
      jobType: 'printable_pdf',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
      scheduleTaskFnFactory: () => () => ({ scheduleParamsTest: { test1: 'yes' } }),
      runTaskFnFactory: () => () => ({ runParamsTest: { test2: 'yes' } }),
    });
    core.getExportTypesRegistry = () => mockExportTypesRegistry;
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
      .send({ jobParams: `abc` })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot('"Invalid export-type of TonyHawksProSkater2"')
      );
  });

  it('returns 500 if job handler throws an error', async () => {
    // throw an error from enqueueJob
    core.getEnqueueJob = jest.fn().mockRejectedValue('Sorry, this tests says no');

    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: `abc` })
      .expect(500);
  });

  it(`returns 200 if job handler doesn't error`, async () => {
    callClusterStub.withArgs('index').resolves({ _id: 'foo', _index: 'foo-index' });

    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: `abc` })
      .expect(200)
      .then(({ body }) => {
        expect(body).toMatchObject({
          job: {
            id: expect.any(String),
          },
          path: expect.any(String),
        });
      });
  });
});
