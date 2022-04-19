/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ReportingCore } from '../..';
import { JobParamsPDFDeprecated, TaskPayloadPDF } from '../../export_types/printable_pdf/types';
import { Report, ReportingStore } from '../../lib/store';
import { ReportApiJSON } from '../../lib/store/report';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { ReportingRequestHandlerContext, ReportingSetup } from '../../types';
import { RequestHandler } from './request_handler';

jest.mock('../../lib/crypto', () => ({
  cryptoFactory: () => ({
    encrypt: () => `hello mock cypher text`,
  }),
}));

const getMockContext = () =>
  ({
    core: coreMock.createRequestHandlerContext(),
  } as unknown as ReportingRequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', search: '', pathname: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest);

const getMockResponseFactory = () =>
  ({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
  } as unknown as KibanaResponseFactory);

const mockLogger = loggingSystemMock.createLogger();

describe('Handle request to generate', () => {
  let reportingCore: ReportingCore;
  let mockContext: ReturnType<typeof getMockContext>;
  let mockRequest: ReturnType<typeof getMockRequest>;
  let mockResponseFactory: ReturnType<typeof getMockResponseFactory>;
  let requestHandler: RequestHandler;

  const mockJobParams: JobParamsPDFDeprecated = {
    browserTimezone: 'UTC',
    objectType: 'cool_object_type',
    title: 'cool_title',
    version: 'unknown',
    layout: { id: 'preserve_layout' },
    relativeUrls: [],
  };

  beforeEach(async () => {
    reportingCore = await createMockReportingCore(createMockConfigSchema({}));
    reportingCore.getStore = () =>
      Promise.resolve({
        addReport: jest
          .fn()
          .mockImplementation(
            (report) => new Report({ ...report, _index: '.reporting-foo-index-234' })
          ),
      } as unknown as ReportingStore);

    mockRequest = getMockRequest();

    mockResponseFactory = getMockResponseFactory();
    (mockResponseFactory.ok as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.forbidden as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.badRequest as jest.Mock) = jest.fn((args: unknown) => args);

    mockContext = getMockContext();
    mockContext.reporting = {} as ReportingSetup;

    requestHandler = new RequestHandler(
      reportingCore,
      { username: 'testymcgee' },
      mockContext,
      mockRequest,
      mockResponseFactory,
      mockLogger
    );
  });

  describe('Enqueue Job', () => {
    test('creates a report object to queue', async () => {
      const report = await requestHandler.enqueueJob('printablePdf', mockJobParams);

      const { _id, created_at: _created_at, payload, ...snapObj } = report;
      expect(snapObj).toMatchInlineSnapshot(`
        Object {
          "_index": ".reporting-foo-index-234",
          "_primary_term": undefined,
          "_seq_no": undefined,
          "attempts": 0,
          "completed_at": undefined,
          "created_by": "testymcgee",
          "jobtype": "printable_pdf",
          "kibana_id": undefined,
          "kibana_name": undefined,
          "max_attempts": undefined,
          "meta": Object {
            "isDeprecated": true,
            "layout": "preserve_layout",
            "objectType": "cool_object_type",
          },
          "metrics": undefined,
          "migration_version": "7.14.0",
          "output": null,
          "process_expiration": undefined,
          "started_at": undefined,
          "status": "pending",
          "timeout": undefined,
        }
      `);
      const { forceNow, ...snapPayload } = payload as TaskPayloadPDF;
      expect(snapPayload).toMatchInlineSnapshot(`
        Object {
          "browserTimezone": "UTC",
          "headers": "hello mock cypher text",
          "isDeprecated": true,
          "layout": Object {
            "id": "preserve_layout",
          },
          "objectType": "cool_object_type",
          "objects": Array [],
          "spaceId": undefined,
          "title": "cool_title",
          "version": "unknown",
        }
      `);
    });

    test('provides a default kibana version field for older POST URLs', async () => {
      (mockJobParams as unknown as { version?: string }).version = undefined;
      const report = await requestHandler.enqueueJob('printablePdf', mockJobParams);

      const { _id, created_at: _created_at, ...snapObj } = report;
      expect(snapObj.payload.version).toBe('7.14.0');
    });
  });

  test('disallows invalid export type', async () => {
    expect(await requestHandler.handleGenerateRequest('neanderthals', mockJobParams))
      .toMatchInlineSnapshot(`
      Object {
        "body": "Invalid export-type of neanderthals",
      }
    `);
  });

  test('disallows unsupporting license', async () => {
    (reportingCore.getLicenseInfo as jest.Mock) = jest.fn(() => ({
      csv_searchsource: {
        enableLinks: false,
        message: `seeing this means the license isn't supported`,
      },
    }));

    expect(await requestHandler.handleGenerateRequest('csv_searchsource', mockJobParams))
      .toMatchInlineSnapshot(`
      Object {
        "body": "seeing this means the license isn't supported",
      }
    `);
  });

  test('generates the download path', async () => {
    const response = (await requestHandler.handleGenerateRequest(
      'csv_searchsource',
      mockJobParams
    )) as unknown as { body: { job: ReportApiJSON } };
    const { id, created_at: _created_at, ...snapObj } = response.body.job;
    expect(snapObj).toMatchInlineSnapshot(`
      Object {
        "attempts": 0,
        "completed_at": undefined,
        "created_by": "testymcgee",
        "index": ".reporting-foo-index-234",
        "jobtype": "csv_searchsource",
        "kibana_id": undefined,
        "kibana_name": undefined,
        "max_attempts": undefined,
        "meta": Object {
          "isDeprecated": undefined,
          "layout": "preserve_layout",
          "objectType": "cool_object_type",
        },
        "metrics": undefined,
        "migration_version": "7.14.0",
        "output": Object {},
        "payload": Object {
          "browserTimezone": "UTC",
          "layout": Object {
            "id": "preserve_layout",
          },
          "objectType": "cool_object_type",
          "relativeUrls": Array [],
          "spaceId": undefined,
          "title": "cool_title",
          "version": "7.14.0",
        },
        "started_at": undefined,
        "status": "pending",
        "timeout": undefined,
      }
    `);
  });
});
