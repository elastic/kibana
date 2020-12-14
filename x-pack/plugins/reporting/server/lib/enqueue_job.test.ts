/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { ReportingCore } from '../';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { ReportingInternalStart } from '../core';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../test_helpers';
import { BasePayload, ReportingRequestHandlerContext } from '../types';
import { ExportTypesRegistry, ReportingStore } from './';
import { enqueueJobFactory } from './enqueue_job';
import { Report } from './store';
import { TaskRunResult } from './tasks';

describe('Enqueue Job', () => {
  const logger = createMockLevelLogger();
  const mockSchema = createMockConfigSchema();
  const mockConfig = createMockConfig(mockSchema);
  let mockReporting: ReportingCore;
  let mockExportTypesRegistry: ExportTypesRegistry;

  beforeAll(async () => {
    mockExportTypesRegistry = new ExportTypesRegistry();
    mockExportTypesRegistry.register({
      id: 'printablePdf',
      name: 'Printable PDFble',
      jobType: 'printable_pdf',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['turquoise'],
      createJobFnFactory: () => async () =>
        (({ createJobTest: { test1: 'yes' } } as unknown) as BasePayload),
      runTaskFnFactory: () => async () =>
        (({ runParamsTest: { test2: 'yes' } } as unknown) as TaskRunResult),
    });
    mockReporting = await createMockReportingCore(mockConfig);
    mockReporting.getExportTypesRegistry = () => mockExportTypesRegistry;
    mockReporting.getStore = () =>
      Promise.resolve(({
        addReport: jest
          .fn()
          .mockImplementation(
            (report) => new Report({ ...report, _index: '.reporting-foo-index-234' })
          ),
      } as unknown) as ReportingStore);

    const scheduleMock = jest.fn().mockImplementation(() => ({
      id: '123-great-id',
    }));

    await mockReporting.pluginStart(({
      taskManager: ({
        ensureScheduled: jest.fn(),
        schedule: scheduleMock,
      } as unknown) as TaskManagerStartContract,
    } as unknown) as ReportingInternalStart);
  });

  it('returns a Report object', async () => {
    const enqueueJob = enqueueJobFactory(mockReporting, logger);
    const report = await enqueueJob(
      'printablePdf',
      {
        objectType: 'visualization',
        title: 'cool-viz',
      },
      false,
      ({} as unknown) as ReportingRequestHandlerContext,
      ({} as unknown) as KibanaRequest
    );

    expect(report).toMatchObject({
      _id: expect.any(String),
      _index: '.reporting-foo-index-234',
      attempts: 0,
      created_by: false,
      created_at: expect.any(String),
      jobtype: 'printable_pdf',
      meta: { objectType: 'visualization' },
      output: null,
      payload: { createJobTest: { test1: 'yes' } },
      status: 'pending',
    });
  });
});
