/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../lib/content_stream', () => ({
  getContentStream: jest.fn(),
}));

import { BehaviorSubject } from 'rxjs';
import { Readable } from 'stream';
import supertest from 'supertest';

import { estypes } from '@elastic/elasticsearch';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { coreMock, type ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import type { ExportType } from '@kbn/reporting-server';
import { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { ReportingCore } from '../../..';
import { ReportingInternalSetup, ReportingInternalStart } from '../../../core';
import { ContentStream, getContentStream } from '../../../lib';
import { reportingMock } from '../../../mocks';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import { ReportingRequestHandlerContext } from '../../../types';
import { EventTracker } from '../../../usage';
import { registerJobInfoRoutesPublic } from '../jobs';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe(`Reporting Job Management Routes: Public`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let eventTracker: EventTracker;
  let usageCounter: IUsageCounter;
  let httpSetup: SetupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let reportingCore: ReportingCore;
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

  const coreSetupMock = coreMock.createSetup();
  const mockConfigSchema = createMockConfigSchema();

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
        securityService: {
          authc: {
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
        },
      },
      mockConfigSchema
    );

    reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);

    usageCounter = {
      domainId: 'abc123',
      incrementCounter: jest.fn(),
    };
    jest.spyOn(reportingCore, 'getUsageCounter').mockReturnValue(usageCounter);

    eventTracker = new EventTracker(coreSetupMock.analytics, 'jobId', 'exportTypeId', 'appId');
    jest.spyOn(reportingCore, 'getEventTracker').mockReturnValue(eventTracker);

    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: 'unencodedJobType',
      jobContentExtension: 'csv',
      validLicenses: ['basic', 'gold'],
    } as ExportType);
    reportingCore.getExportTypesRegistry = () => exportTypesRegistry;

    mockEsClient = (await reportingCore.getEsClient()).asInternalUser as typeof mockEsClient;
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

  describe('download report', () => {
    it('fails on malformed download IDs', async () => {
      mockEsClient.search.mockResponseOnce(getHits());
      registerJobInfoRoutesPublic(reportingCore);

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
          securityService: { authc: { getCurrentUser: () => undefined } },
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerJobInfoRoutesPublic(reportingCore);

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
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/poo`)
        .expect(404);
    });

    it('when a job is incomplete', async () => {
      mockEsClient.search.mockResponseOnce(
        getHits({
          jobtype: 'unencodedJobType',
          status: 'pending',
          payload: { title: 'incomplete!' },
        })
      );
      registerJobInfoRoutesPublic(reportingCore);

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
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(500)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(({ body }) =>
          expect(body.message).toEqual('Reporting generation failed: job failure message')
        );
    });

    it('when a known job-type is complete', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });
  });

  describe('delete report', () => {
    it('handles content stream errors', async () => {
      stream = new Readable({
        read() {
          this.push('test');
          this.push(null);
        },
      }) as typeof stream;
      stream.end = jest.fn().mockImplementation((_name, _encoding, callback) => {
        callback(new Error('An error occurred in ending the content stream'));
      });

      (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(stream);
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${PUBLIC_ROUTES.JOBS.DELETE_PREFIX}/denk`)
        .expect(500)
        .expect('Content-Type', 'application/json; charset=utf-8');
    });
  });

  describe('telemetry', () => {
    it('increments the download api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(reportingCore);

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
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${PUBLIC_ROUTES.JOBS.DELETE_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'delete /api/reporting/jobs/delete/{docId}:unencodedJobType',
        counterType: 'reportingApi',
      });
    });

    it('supports download report event tracking', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener).get(`${PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`);

      expect(eventTracker.downloadReport).toHaveBeenCalledTimes(1);
    });

    it('supports delete report event tracking', async () => {
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
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutesPublic(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${PUBLIC_ROUTES.JOBS.DELETE_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(eventTracker.deleteReport).toHaveBeenCalledTimes(1);
    });
  });
});
