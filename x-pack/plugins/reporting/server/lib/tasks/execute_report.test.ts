/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CancellationToken, KibanaShuttingDownError } from '@kbn/reporting-common';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecuteReportTask } from '.';
import { ReportingCore } from '../..';
import { ReportingConfigType } from '../../config';
import { PdfExportType } from '../../export_types/printable_pdf_v2';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import type { SavedReport } from '../store';
import { getContentStream } from '../content_stream';

const logger = loggingSystemMock.createLogger();

describe('Execute Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  let pdfExport: PdfExportType;
  beforeAll(async () => {
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);
    const mockCoreSetup = coreMock.createSetup();
    const mockLogger = loggingSystemMock.createLogger();
    pdfExport = new PdfExportType(
      mockCoreSetup,
      configType,
      mockLogger,
      coreMock.createPluginInitializerContext(configType)
    );
  });

  it('Instance setup', () => {
    const task = new ExecuteReportTask(mockReporting, configType, logger);
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": 1,
        "maxConcurrency": 1,
        "timeout": "120s",
        "title": "Reporting: execute job",
        "type": "report:execute",
      }
    `);
  });

  it('Instance start', () => {
    const mockTaskManager = taskManagerMock.createStart();
    const task = new ExecuteReportTask(mockReporting, configType, logger);
    expect(task.init(mockTaskManager));
    expect(task.getStatus()).toBe('initialized');
  });

  it('Max Concurrency is 0 if pollEnabled is false', () => {
    const queueConfig = {
      queue: { pollEnabled: false, timeout: 55000 },
    } as unknown as ReportingConfigType['queue'];

    const task = new ExecuteReportTask(mockReporting, { ...configType, ...queueConfig }, logger);
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": 1,
        "maxConcurrency": 0,
        "timeout": "55s",
        "title": "Reporting: execute job",
        "type": "report:execute",
      }
    `);
  });

  it('throws during reporting if Kibana starts shutting down', async () => {
    const store = await mockReporting.getStore();
    store.setReportFailed = jest.fn(() => Promise.resolve({} as any));
    const task = new ExecuteReportTask(mockReporting, configType, logger);
    task._claimJob = jest.fn(() =>
      Promise.resolve({ _id: 'test', jobtype: 'noop', status: 'pending' } as SavedReport)
    );
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);
    const stream = await getContentStream(mockReporting, { id: 'test', index: '0' });

    const taskPromise = pdfExport.runTask(
      {
        layout: {
          id: undefined,
          dimensions: undefined,
          selectors: undefined,
          zoom: undefined,
        },
        forceNow: '',
        headers: 'cool-encryption-key-where-did-you-find-it',
        objectType: '',
        title: '',
        browserTimezone: '',
        version: '',
        locatorParams: [],
      },
      'test',
      new CancellationToken(),
      stream
    );
    setImmediate(() => {
      mockReporting.pluginStop();
    });
    await taskPromise;

    expect(store.setReportFailed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        _id: 'test',
      }),
      expect.objectContaining({
        output: expect.objectContaining({
          error_code: new KibanaShuttingDownError().code,
        }),
      })
    );
  });
});
