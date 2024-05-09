/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { KibanaShuttingDownError } from '@kbn/reporting-common';
import { ReportDocument } from '@kbn/reporting-common/types';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import type { ExportType, ReportingConfigType } from '@kbn/reporting-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { ExecuteReportTask } from '.';
import type { ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';

const logger = loggingSystemMock.createLogger();

describe('Execute Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  beforeAll(async () => {
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);
  });

  it('Instance setup', () => {
    const task = new ExecuteReportTask(mockReporting, configType, logger);
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": ${configType.capture.maxAttempts + 1},
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

  it('create task runner', async () => {
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new ExecuteReportTask(mockReporting, configType, logger);
    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'cool-reporting-id' },
      },
    } as unknown as RunContext);
    expect(taskRunner).toHaveProperty('run');
    expect(taskRunner).toHaveProperty('cancel');
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
        "maxAttempts": 2,
        "maxConcurrency": 0,
        "timeout": "55s",
        "title": "Reporting: execute job",
        "type": "report:execute",
      }
    `);
  });

  it('throws during reporting if Kibana starts shutting down', async () => {
    mockReporting.getExportTypesRegistry().register({
      id: 'noop',
      name: 'Noop',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: () => new Promise(() => {}),
      jobContentExtension: 'pdf',
      jobType: 'noop',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    store.setReportError = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'noop',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    const task = new ExecuteReportTask(mockReporting, configType, logger);
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the ExecuteReportTask instance
      .spyOn(task, '_claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'noop', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'noop', jobtype: 'noop', payload: {} },
      },
    } as unknown as RunContext);

    const taskPromise = taskRunner.run();
    setImmediate(() => {
      mockReporting.pluginStop();
    });
    await taskPromise.catch(() => {});

    expect(store.setReportError).toHaveBeenLastCalledWith(
      expect.objectContaining({
        _id: 'test',
      }),
      expect.objectContaining({
        error: expect.objectContaining({
          message: `ReportingError(code: ${new KibanaShuttingDownError().code})`,
        }),
      })
    );
  });
});
