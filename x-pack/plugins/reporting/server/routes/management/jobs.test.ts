/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../lib/content_stream', () => ({
  getContentStream: jest.fn(),
}));

import { Readable } from 'stream';
import { UnwrapPromise } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { of } from 'rxjs';
import { ElasticsearchClient } from 'kibana/server';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { ReportingCore } from '../..';
import { ReportingInternalSetup } from '../../core';
import { ContentStream, ExportTypesRegistry, getContentStream } from '../../lib';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockReportingCore,
} from '../../test_helpers';
import { ExportTypeDefinition, ReportingRequestHandlerContext } from '../../types';
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
  let stream: jest.Mocked<ContentStream>;

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
    stream = new Readable({
      read() {
        this.push('test');
        this.push(null);
      },
    }) as typeof stream;

    (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(stream);
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
    core.pluginSetupDeps = {
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
    } as unknown as ReportingInternalSetup;
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
      body: getHits({
        jobtype: 'invalidJobType',
        payload: { title: 'invalid!' },
      }),
    } as any);
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/download/poo').expect(401);
  });

  it(`returns job's info`, async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({
        jobtype: 'base64EncodedJobType',
        payload: {}, // payload is irrelevant
      }),
    } as any);

    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/info/test').expect(200);
  });

  it(`returns 403 if a user cannot view a job's info`, async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({
        jobtype: 'customForbiddenJobType',
        payload: {}, // payload is irrelevant
      }),
    } as any);

    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/info/test').expect(403);
  });

  it('when a job is incomplete', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      body: getHits({
        jobtype: 'unencodedJobType',
        status: 'pending',
        payload: { title: 'incomplete!' },
      }),
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
    mockEsClient.search.mockResolvedValue({
      body: getHits({
        jobtype: 'unencodedJobType',
        status: 'failed',
        output: { content: 'job failure message' },
        payload: { title: 'failing job!' },
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
      outputContentType = 'text/plain',
      title = '',
    } = {}) => {
      return getHits({
        jobtype: jobType,
        status: 'completed',
        output: { content_type: outputContentType },
        payload: { title },
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

    it('forwards job content stream', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        body: getCompleteHits({
          jobType: 'unencodedJobType',
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

    it('refuses to return unknown content-types', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        body: getCompleteHits({
          jobType: 'unencodedJobType',
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
      core.pluginSetupDeps = {
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
      } as unknown as ReportingInternalSetup;
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
