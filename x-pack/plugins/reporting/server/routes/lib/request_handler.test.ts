/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from 'kibana/server';
import { coreMock, httpServerMock } from 'src/core/server/mocks';
import { ReportingCore } from '../..';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { BaseParams, ReportingRequestHandlerContext, ReportingSetup } from '../../types';
import { RequestHandler } from './request_handler';

jest.mock('../../lib/enqueue_job', () => ({
  enqueueJob: () => ({
    _id: 'id-of-this-test-report',
    toApiJSON: () => JSON.stringify({ id: 'id-of-this-test-report' }),
  }),
}));

const getMockContext = () =>
  (({
    core: coreMock.createRequestHandlerContext(),
  } as unknown) as ReportingRequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', search: '', pathname: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest);

const getMockResponseFactory = () =>
  (({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
  } as unknown) as KibanaResponseFactory);

const mockLogger = createMockLevelLogger();

describe('Handle request to generate', () => {
  let reportingCore: ReportingCore;
  let mockContext: ReturnType<typeof getMockContext>;
  let mockRequest: ReturnType<typeof getMockRequest>;
  let mockResponseFactory: ReturnType<typeof getMockResponseFactory>;
  let requestHandler: RequestHandler;

  const mockJobParams = {} as BaseParams;

  beforeEach(async () => {
    reportingCore = await createMockReportingCore(createMockConfigSchema({}));
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
      csv: { enableLinks: false, message: `seeing this means the license isn't supported` },
    }));

    expect(await requestHandler.handleGenerateRequest('csv', mockJobParams)).toMatchInlineSnapshot(`
      Object {
        "body": "seeing this means the license isn't supported",
      }
    `);
  });

  test('generates the download path', async () => {
    expect(await requestHandler.handleGenerateRequest('csv', mockJobParams)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "job": "{\\"id\\":\\"id-of-this-test-report\\"}",
          "path": "undefined/api/reporting/jobs/download/id-of-this-test-report",
        },
        "headers": Object {
          "content-type": "application/json",
        },
      }
    `);
  });
});
