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
import { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { BehaviorSubject } from 'rxjs';
import { Readable } from 'stream';
import supertest from 'supertest';
import { ReportingCore } from '../../..';
import { PUBLIC_ROUTES } from '../../../../common/constants';
import { ReportingInternalSetup, ReportingInternalStart } from '../../../core';
import { ExportType } from '../../../export_types/common';
import { ContentStream, ExportTypesRegistry, getContentStream } from '../../../lib';
import { reportingMock } from '../../../mocks';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import { ReportingRequestHandlerContext } from '../../../types';
import { registerJobInfoRoutesPublic } from '../jobs';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe(`GET ${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let usageCounter: IUsageCounter;
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

    usageCounter = {
      incrementCounter: jest.fn(),
    };
    core.getUsageCounter = jest.fn().mockReturnValue(usageCounter);

    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: 'unencodedJobType',
      jobContentExtension: 'csv',
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
    stream.end = jest.fn().mockImplementation((_name, _encoding, callback) => {
      callback();
    });

    (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(stream);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('fails on malformed download IDs', async () => {
    mockEsClient.search.mockResponseOnce(getHits());
    registerJobInfoRoutesPublic(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/1`)
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
    registerJobInfoRoutesPublic(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dope`)
      .expect(401)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
      );
  });

  it('returns 404 if job not found', async () => {
    mockEsClient.search.mockResponseOnce(getHits());
    registerJobInfoRoutesPublic(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/poo`)
      .expect(404);
  });

  it('returns a 403 if not a valid job type', async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'invalidJobType',
        payload: { title: 'invalid!' },
      })
    );
    registerJobInfoRoutesPublic(core);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/poo`)
      .expect(403);
  });

  it('when a job is incomplete', async () => {
    mockEsClient.search.mockResponseOnce(
      getHits({
        jobtype: 'unencodedJobType',
        status: 'pending',
        payload: { title: 'incomplete!' },
      })
    );
    registerJobInfoRoutesPublic(core);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
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
    registerJobInfoRoutesPublic(core);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .then(({ body }) =>
        expect(body.message).toEqual('Reporting generation failed: job failure message')
      );
  });

  describe('successful downloads', () => {
    it('when a known job-type is complete', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });
  });

  describe('usage counters', () => {
    it('increments the download api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `get ${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/{docId}:unencodedJobType`,
        counterType: 'reportingApi',
      });
    });

    it('increments the delete api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(core);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`/api/reporting/jobs/delete/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'delete /api/reporting/jobs/delete/{docId}:unencodedJobType',
        counterType: 'reportingApi',
      });
    });
  });
});
