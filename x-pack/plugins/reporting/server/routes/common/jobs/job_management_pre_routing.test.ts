/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ReportingCore } from '../../..';
import { ReportingInternalSetup, ReportingInternalStart } from '../../../core';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import { jobsQueryFactory } from './jobs_query';
import { jobManagementPreRouting } from './job_management_pre_routing';

jest.mock('../../../lib/content_stream');
jest.mock('./jobs_query');

const mockReportingConfig = createMockConfigSchema();
let mockCore: ReportingCore;
let mockSetupDeps: ReportingInternalSetup;
let mockStartDeps: ReportingInternalStart;
const mockJobsQueryFactory = jobsQueryFactory as jest.Mocked<any>;
const mockResponseFactory = httpServerMock.createResponseFactory();
const mockCounters = {
  usageCounter: jest.fn(),
  errorCounter: jest.fn(),
};
const mockUser = { username: 'joeuser' };
const options = { isInternal: false };

beforeEach(async () => {
  mockSetupDeps = createMockPluginSetup({
    security: { license: { isEnabled: () => true } },
  });

  mockStartDeps = await createMockPluginStart(
    {
      securityService: {
        authc: {
          getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
        },
      },
    },
    mockReportingConfig
  );
  mockCore = await createMockReportingCore(mockReportingConfig, mockSetupDeps, mockStartDeps);
});

it(`should return 404 if the docId isn't resolve`, async function () {
  mockJobsQueryFactory.mockReturnValue({
    get: jest.fn(),
  });

  let handlerCalled = false;
  const handler = async () => {
    handlerCalled = true;
    return {
      status: 200,
      options: {},
    };
  };

  await jobManagementPreRouting(
    mockCore,
    mockResponseFactory,
    'doc123',
    mockUser,
    mockCounters,
    options,
    handler
  );

  expect(mockResponseFactory.notFound).toBeCalled();
  expect(handlerCalled).toBe(false);
});

it(`should call callback when document is available`, async function () {
  mockJobsQueryFactory.mockReturnValue({
    get: jest.fn(() => ({ jobtype: 'csv_searchsource' })),
  });

  let handlerCalled = false;
  const handler = async () => {
    handlerCalled = true;
    return {
      status: 200,
      options: {},
    };
  };

  await jobManagementPreRouting(
    mockCore,
    mockResponseFactory,
    'doc123',
    mockUser,
    mockCounters,
    options,
    handler
  );

  expect(handlerCalled).toBe(true);
});

describe('usage counters', () => {
  beforeEach(() => {
    mockCounters.usageCounter.mockReset();
    mockCounters.errorCounter.mockReset();
  });

  it(`should track valid usage`, async function () {
    mockJobsQueryFactory.mockReturnValue({
      get: jest.fn(() => ({ jobtype: 'csv_searchsource' })),
    });

    const handler = async () => ({
      status: 200,
      options: {},
    });

    expect(mockCounters.usageCounter).not.toBeCalled();

    await jobManagementPreRouting(
      mockCore,
      mockResponseFactory,
      'doc123',
      mockUser,
      mockCounters,
      options,
      handler
    );

    expect(mockCounters.usageCounter).toBeCalled();
  });

  it(`should track error case`, async function () {
    mockJobsQueryFactory.mockReturnValue({
      get: jest.fn(() => ({ jobtype: 'csv_searchsource' })),
    });

    const handler = async () => {
      throw new Error(`this error is a test`);
    };

    expect(mockCounters.errorCounter).not.toBeCalled();

    await jobManagementPreRouting(
      mockCore,
      mockResponseFactory,
      'doc123',
      mockUser,
      mockCounters,
      options,
      handler
    );

    expect(mockCounters.errorCounter).toBeCalled();
  });
});
