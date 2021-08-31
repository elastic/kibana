/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { ReportingCore } from '../';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { ReportingInternalStart } from '../core';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../test_helpers';
import { ReportingRequestHandlerContext } from '../types';
import { ExportTypesRegistry, ReportingStore } from './';
import { enqueueJob } from './enqueue_job';
import { Report } from './store';

describe('Enqueue Job', () => {
  const logger = createMockLevelLogger();
  let mockReporting: ReportingCore;
  let mockExportTypesRegistry: ExportTypesRegistry;

  const mockBaseParams = {
    browserTimezone: 'UTC',
    headers: 'cool_encrypted_headers',
    objectType: 'cool_object_type',
    title: 'cool_title',
    version: 'unknown' as any,
  };

  beforeEach(() => {
    mockBaseParams.version = '7.15.0-test';
  });

  beforeAll(async () => {
    mockExportTypesRegistry = new ExportTypesRegistry();
    mockExportTypesRegistry.register({
      id: 'printablePdf',
      name: 'Printable PDFble',
      jobType: 'printable_pdf',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['turquoise'],
      createJobFnFactory: () => async () => mockBaseParams,
      runTaskFnFactory: jest.fn(),
    });
    mockReporting = await createMockReportingCore(createMockConfigSchema());
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
    const report = await enqueueJob(
      mockReporting,
      ({} as unknown) as KibanaRequest,
      ({} as unknown) as ReportingRequestHandlerContext,
      false,
      'printablePdf',
      mockBaseParams,
      logger
    );

    const { _id, created_at: _created_at, ...snapObj } = report;
    expect(snapObj).toMatchInlineSnapshot(`
      Object {
        "_index": ".reporting-foo-index-234",
        "_primary_term": undefined,
        "_seq_no": undefined,
        "attempts": 0,
        "browser_type": undefined,
        "completed_at": undefined,
        "created_by": false,
        "jobtype": "printable_pdf",
        "kibana_id": undefined,
        "kibana_name": undefined,
        "max_attempts": undefined,
        "meta": Object {
          "isDeprecated": undefined,
          "layout": undefined,
          "objectType": "cool_object_type",
        },
        "migration_version": "7.14.0",
        "output": null,
        "payload": Object {
          "browserTimezone": "UTC",
          "headers": "cool_encrypted_headers",
          "objectType": "cool_object_type",
          "title": "cool_title",
          "version": "7.15.0-test",
        },
        "process_expiration": undefined,
        "started_at": undefined,
        "status": "pending",
        "timeout": undefined,
      }
    `);
  });

  it('provides a default kibana version field for older POST URLs', async () => {
    mockBaseParams.version = undefined;
    const report = await enqueueJob(
      mockReporting,
      ({} as unknown) as KibanaRequest,
      ({} as unknown) as ReportingRequestHandlerContext,
      false,
      'printablePdf',
      mockBaseParams,
      logger
    );

    const { _id, created_at: _created_at, ...snapObj } = report;
    expect(snapObj.payload.version).toBe('7.14.0');
  });
});
