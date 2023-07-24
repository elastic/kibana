/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../lib/content_stream', () => ({
  getContentStream: jest.fn(),
}));
import { estypes } from '@elastic/elasticsearch';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { BehaviorSubject } from 'rxjs';
import { Readable } from 'stream';
import supertest from 'supertest';
import { ReportingCore } from '../../..';
import { ReportingInternalSetup, ReportingInternalStart } from '../../../core';
import { ContentStream, ExportTypesRegistry, getContentStream } from '../../../lib';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import { ReportingRequestHandlerContext } from '../../../types';
import { registerJobInfoRoutes } from '../jobs';
import { ExportType } from '../../../export_types/common';
import { reportingMock } from '../../../mocks';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('GET /api/reporting/jobs/download', () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let core: ReportingCore;
  let mockSetupDeps: ReportingInternalSetup;
  let mockStartDeps: ReportingInternalStart;
  let mockEsClient: ElasticsearchClientMock;
  let stream: jest.Mocked<ContentStream>;

  const getHits = (...sources: any) => {
    return {
      hits: {
        hits: sources.map((source: object) => ({ _source: source })),
      },
    } as estypes.SearchResponseBody;
  };

  const mockConfigSchema = createMockConfigSchema({ roles: { enabled: false } });

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );

    mockSetupDeps = createMockPluginSetup({
      security: {
        license: { isEnabled: () => true },
      },
      router: httpSetup.createRouter(''),
    });

    mockStartDeps = await createMockPluginStart(
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

    core = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);

    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: 'unencodedJobType',
      jobContentExtension: 'csv',
      validLicenses: ['basic', 'gold'],
    } as ExportType);
    exportTypesRegistry.register({
      id: 'base64Encoded',
      jobType: 'base64EncodedJobType',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
    } as ExportType);
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
    mockEsClient.search.mockResponseOnce(getHits());
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
    mockStartDeps = await createMockPluginStart(
      {
        licensing: {
          ...licensingMock.createStart(),
          license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
        },
        security: { authc: { getCurrentUser: () => undefined } },
      },
      mockConfigSchema
    );
    core = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
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
    mockEsClient.search.mockResponseOnce(getHits());
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/download/poo').expect(404);
  });

  it('returns a 403 if not a valid job type', async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'invalidJobType',
        payload: { title: 'invalid!' },
      })
    );
    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/download/poo').expect(403);
  });

  it(`returns job's info`, async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'base64EncodedJobType',
        payload: {}, // payload is irrelevant
      })
    );

    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/info/test').expect(200);
  });

  it(`returns 403 if a user cannot view a job's info`, async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'customForbiddenJobType',
        payload: {}, // payload is irrelevant
      })
    );

    registerJobInfoRoutes(core);

    await server.start();

    await supertest(httpSetup.server.listener).get('/api/reporting/jobs/info/test').expect(403);
  });

  it('when a job is incomplete', async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'unencodedJobType',
        status: 'pending',
        payload: { title: 'incomplete!' },
      })
    );
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
    mockEsClient.search.mockResponse(
      getHits({
        jobtype: 'unencodedJobType',
        status: 'failed',
        output: { content: 'job failure message' },
        payload: { title: 'failing job!' },
      })
    );
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
      }) as estypes.SearchResponseBody;
    };

    it('when a known job-type is complete', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });

    it('succeeds when security is not there or disabled', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());

      // @ts-ignore
      core.pluginSetupDeps.security = null;

      registerJobInfoRoutes(core);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dope')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });

    it('forwards job content stream', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: 'unencodedJobType',
        })
      );
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .then(({ text }) => expect(text).toEqual('test'));
    });

    it('refuses to return unknown content-types', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: 'unencodedJobType',
          outputContentType: 'application/html',
        })
      );
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

    it('allows multi-byte characters in file names', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: 'base64EncodedJobType',
          title: '日本語ダッシュボード',
        })
      );
      registerJobInfoRoutes(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/japanese-dashboard')
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect(
          'content-disposition',
          'attachment; filename=%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%80%E3%83%83%E3%82%B7%E3%83%A5%E3%83%9C%E3%83%BC%E3%83%89.pdf'
        );
    });
  });

  describe('Deprecated: role-based access control', () => {
    it('fails on users without the appropriate role', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
          },
          security: {
            authc: {
              getCurrentUser: () => ({ id: '123', roles: ['peasant'], username: 'Tom Riddle' }),
            },
          },
        },
        mockConfigSchema
      );

      core = await createMockReportingCore(
        createMockConfigSchema({ roles: { enabled: true } }),
        mockSetupDeps,
        mockStartDeps
      );

      registerJobInfoRoutes(core);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dope')
        .expect(403)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(`
            "Ask your administrator for access to reporting features. <a href=https://www.elastic.co/guide/en/kibana/test-branch/secure-reporting.html#grant-user-access style=\\"font-weight: 600;\\"
                                target=\\"_blank\\" rel=\\"noopener\\">Learn more</a>."
          `)
        );
    });
  });
});
