/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { setupServer } from 'src/core/server/test_utils';
import { registerJobGenerationRoutes } from './generation';
import { createMockReportingCore } from '../test_helpers';
import { ReportingCore } from '..';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { ExportTypeDefinition } from '../types';
import { LevelLogger } from '../lib';
import { of } from 'rxjs';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/reporting/generate', () => {
  const reportingSymbol = Symbol('reporting');
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let core: ReportingCore;

  const config = {
    get: jest.fn().mockImplementation((...args) => {
      const key = args.join('.');
      switch (key) {
        case 'queue.indexInterval':
          return 10000;
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
  const mockLogger = ({
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown) as jest.Mocked<LevelLogger>;

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext(reportingSymbol, 'reporting', () => ({}));
    const mockDeps = ({
      elasticsearch: {
        legacy: {
          client: { callAsInternalUser: jest.fn() },
        },
      },
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
    } as unknown) as any;
    core = await createMockReportingCore(config, mockDeps);
    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'printablePdf',
      jobType: 'printable_pdf',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
    } as ExportTypeDefinition<unknown, unknown, unknown, unknown>);
    core.getExportTypesRegistry = () => exportTypesRegistry;
  });

  afterEach(async () => {
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
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

  it('returns 400 if job handler throws an error', async () => {
    const errorText = 'you found me';
    core.getEnqueueJob = async () =>
      jest.fn().mockImplementation(() => ({
        toJSON: () => {
          throw new Error(errorText);
        },
      }));

    registerJobGenerationRoutes(core, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post('/api/reporting/generate/printablePdf')
      .send({ jobParams: `abc` })
      .expect(400)
      .then(({ body }) => {
        expect(body.message).toMatchInlineSnapshot(`"${errorText}"`);
      });
  });
});
