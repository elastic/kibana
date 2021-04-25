/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnwrapPromise } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { of } from 'rxjs';
import { ElasticsearchClient } from 'kibana/server';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '..';
import { ReportingInternalSetup } from '../core';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockReportingCore,
} from '../test_helpers';
import { ExportTypeDefinition, ReportingRequestHandlerContext } from '../types';
import { registerJobInfoRoutes } from './jobs';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('GET /api/reporting/jobs/download', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let core: ReportingCore;
  let mockSetupDeps: ReportingInternalSetup;
  let mockEsClient: DeeplyMockedKeys<ElasticsearchClient>;

  const getHits = (...sources: any) => {
    return {
      hits: {
        hits: sources.map((source: object) => ({ _source: source })),
      },
    };
  };

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
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
    // @ts-ignore
    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: 'unencodedJobType',
      jobContentExtension: 'csv',
      validLicenses: ['basic', 'gold'],
    } as ExportTypeDefinition);
    exportTypesRegistry.register({
      id: 'base64Encoded',
      jobType: 'base64EncodedJobType',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
    } as ExportTypeDefinition);
    core.getExportTypesRegistry = () => exportTypesRegistry;

    mockEsClient = (await core.getEsClient()).asInternalUser as typeof mockEsClient;
  });

  afterEach(async () => {
    await server.stop();
  });

  it('fails on malformed download IDs', async () => {
    mockEsClient.search.mockResolvedValueOnce({ body: getHits() } as any);
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/1')
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          '"[request params.docId]: value has length [1] but it must have a minimum length of [3]."'
        )
      );
  });

  it('fails on unauthenticated users', async () => {
    // @ts-ignore
    core.pluginSetupDeps = ({
      // @ts-ignore
      ...core.pluginSetupDeps,
      security: {
        license: {
          isEnabled: () => true,
        },
        authc: {
          getCurrentUser: () => undefined,
        },
      },
    } as unknown) as ReportingInternalSetup;
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dope')
      .expect(401)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
      );
  });

  it('returns 404 if job not found', async () => {
    mockEsClient.search.mockResolvedValueOnce({ body: getHits() } as any);
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/download/poo').expect(404);
  });

  it('returns a 401 if not a valid job type', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({ jobtype: 'invalidJobType' }),
    } as any);
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/download/poo').expect(401);
  });

  it('when a job is incomplete', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({ jobtype: 'unencodedJobType', status: 'pending' }),
    } as any);
    registerJobInfoRoutes(core);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dank')
      .expect(503)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Retry-After', '30')
      .then(({ text }) => expect(text).toEqual('pending'));
  });

  it('when a job fails', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({
        jobtype: 'unencodedJobType',
        status: 'failed',
        output: { content: 'job failure message' },
      }),
    } as any);
    registerJobInfoRoutes(core);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dank')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .then(({ body }) =>
        expect(body.message).toEqual('Reporting generation failed: job failure message')
      );
  });

  describe('successful downloads', () => {
    const getCompleteHits = ({
      jobType = 'unencodedJobType',
      outputContent = 'job output content',
      outputContentType = 'text/plain',
      title = '',
    } = {}) => {
      return getHits({
        jobtype: jobType,
        status: 'completed',
        output: { content: outputContent, content_type: outputContentType },
        payload: {
          title,
        },
      });
    };

    it('when a known job-type is complete', async () => {
      mockEsClient.search.mockResolvedValueOnce({ body: getCompleteHits() } as any);
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('content-disposition', 'inline; filename="report.csv"');
    });

    it('succeeds when security is not there or disabled', async () => {
      mockEsClient.search.mockResolvedValueOnce({ body: getCompleteHits() } as any);

      // @ts-ignore
      core.pluginSetupDeps.security = null;

      registerJobInfoRoutes(core);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dope')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('content-disposition', 'inline; filename="report.csv"');
    });

    it(`doesn't encode output-content for non-specified job-types`, async () => {
      mockEsClient.search.mockResolvedValueOnce({
        body: getCompleteHits({
          jobType: 'unencodedJobType',
          outputContent: 'test',
        }),
      } as any);
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then(({ text }) => expect(text).toEqual('test'));
    });

    it(`base64 encodes output content for configured jobTypes`, async () => {
      mockEsClient.search.mockResolvedValueOnce({
        body: getCompleteHits({
          jobType: 'base64EncodedJobType',
          outputContent: 'test',
          outputContentType: 'application/pdf',
        }),
      } as any);
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('content-disposition', 'inline; filename="report.pdf"')
        .then(({ body }) => expect(Buffer.from(body).toString('base64')).toEqual('test'));
    });

    it('refuses to return unknown content-types', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        body: getCompleteHits({
          jobType: 'unencodedJobType',
          outputContent: 'alert("all your base mine now");',
          outputContentType: 'application/html',
        }),
      } as any);
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(400)
        .then(({ body }) => {
          expect(body).toEqual({
            error: 'Bad Request',
            message: 'Unsupported content-type of application/html specified by job output',
            statusCode: 400,
          });
        });
    });
  });

  describe('Deprecated: role-based access control', () => {
    it('fails on users without the appropriate role', async () => {
      const deprecatedConfig = createMockConfigSchema({ roles: { enabled: true } });
      core = await createMockReportingCore(deprecatedConfig, mockSetupDeps);
      // @ts-ignore
      core.pluginSetupDeps = ({
        // @ts-ignore
        ...core.pluginSetupDeps,
        security: {
          license: {
            isEnabled: () => true,
          },
          authc: {
            getCurrentUser: () => ({
              id: '123',
              roles: ['peasant'],
              username: 'Tom Riddle',
            }),
          },
        },
      } as unknown) as ReportingInternalSetup;
      registerJobInfoRoutes(core);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dope')
        .expect(403)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(`"Sorry, you don't have access to Reporting"`)
        );
    });
  });
});
