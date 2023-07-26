/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import rison from '@kbn/rison';
import { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';
import { ReportingCore } from '../../..';
import { PUBLIC_ROUTES } from '../../../../common/constants';
import { PdfExportType } from '../../../export_types/printable_pdf_v2';
import { ReportingStore } from '../../../lib';
import { ExportTypesRegistry } from '../../../lib/export_types_registry';
import { Report } from '../../../lib/store';
import { reportingMock } from '../../../mocks';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import type { ReportingRequestHandlerContext } from '../../../types';
import { registerGenerationRoutesPublic } from '../generate_from_jobparams';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe(`POST ${PUBLIC_ROUTES.GENERATE_PREFIX}`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let usageCounter: IUsageCounter;
  let httpSetup: SetupServerReturn['httpSetup'];
  let mockExportTypesRegistry: ExportTypesRegistry;
  let mockReportingCore: ReportingCore;
  let store: ReportingStore;

  const mockConfigSchema = createMockConfigSchema({
    queue: { indexInterval: 'year', timeout: 10000, pollEnabled: true },
  });

  const mockLogger = loggingSystemMock.createLogger();
  const mockCoreSetup = coreMock.createSetup();

  const mockPdfExportType = new PdfExportType(
    mockCoreSetup,
    mockConfigSchema,
    mockLogger,
    coreMock.createPluginInitializerContext(mockConfigSchema)
  );

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );

    const mockSetupDeps = createMockPluginSetup({
      security: { license: { isEnabled: () => true } },
      router: httpSetup.createRouter(''),
    });

    const mockStartDeps = await createMockPluginStart(
      {
        licensing: {
          ...licensingMock.createStart(),
          license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
        },
        security: {
          authc: {
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
        },
      },
      mockConfigSchema
    );

    mockReportingCore = await createMockReportingCore(
      mockConfigSchema,
      mockSetupDeps,
      mockStartDeps
    );

    usageCounter = {
      incrementCounter: jest.fn(),
    };
    mockReportingCore.getUsageCounter = jest.fn().mockReturnValue(usageCounter);

    mockExportTypesRegistry = new ExportTypesRegistry();
    mockExportTypesRegistry.register(mockPdfExportType);

    store = await mockReportingCore.getStore();
    store.addReport = jest.fn().mockImplementation(async (opts) => {
      return new Report({
        ...opts,
        _id: 'foo',
        _index: 'foo-index',
      });
    });
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns 400 if there are no job params', async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          '"A jobParams RISON string is required in the querystring or POST body"'
        )
      );
  });

  it('returns 400 if job params query is invalid', async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf?jobParams=foo:`)
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 if job params body is invalid', async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
      .send({ jobParams: `foo:` })
      .expect(400)
      .then(({ body }) => expect(body.message).toMatchInlineSnapshot('"invalid rison: foo:"'));
  });

  it('returns 400 export type is invalid', async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/TonyHawksProSkater2`)
      .send({ jobParams: rison.encode({ title: `abc` }) })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot('"Invalid export-type of TonyHawksProSkater2"')
      );
  });

  it('returns 400 on invalid browser timezone', async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
      .send({ jobParams: rison.encode({ browserTimezone: 'America/Amsterdam', title: `abc` }) })
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Invalid timezone \\"America/Amsterdam\\"."`)
      );
  });

  it('returns 500 if job handler throws an error', async () => {
    store.addReport = jest.fn().mockRejectedValue('silly');

    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
      .send({ jobParams: rison.encode({ title: `abc` }) })
      .expect(500);
  });

  it(`returns 200 if job handler doesn't error`, async () => {
    registerGenerationRoutesPublic(mockReportingCore, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
      .send({
        jobParams: rison.encode({
          title: `abc`,
          relativeUrls: ['test'],
          layout: { id: 'test' },
          objectType: 'canvas workpad',
        }),
      })
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
              forceNow: expect.any(String),
              isDeprecated: true,
              layout: {
                id: 'test',
              },
              objectType: 'canvas workpad',
              objects: [
                {
                  relativeUrl: 'test',
                },
              ],
              title: 'abc',
              version: '7.14.0',
            },
            status: 'pending',
          },
          path: '/mock-server-basepath/api/reporting/jobs/download/foo',
        });
      });
  });

  describe('usage counters', () => {
    it('increments generation api counter', async () => {
      registerGenerationRoutesPublic(mockReportingCore, mockLogger);

      await server.start();

      await supertest(httpSetup.server.listener)
        .post(`${PUBLIC_ROUTES.GENERATE_PREFIX}/printablePdf`)
        .send({
          jobParams: rison.encode({
            title: `abc`,
            relativeUrls: ['test'],
            layout: { id: 'test' },
            objectType: 'canvas workpad',
          }),
        })
        .expect(200);

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `post /api/reporting/generate/printablePdf`,
        counterType: 'reportingApi',
      });
    });
  });
});
