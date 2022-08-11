/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ReportingCore } from '../..';
import { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ReportingConfigType } from '../../config';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { MonitorReportsTask } from '.';

const logger = loggingSystemMock.createLogger();

describe('Execute Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  beforeAll(async () => {
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);
  });

  it('Instance setup', () => {
    const task = new MonitorReportsTask(mockReporting, configType, logger);
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": 1,
        "timeout": "120s",
        "title": "Reporting: monitor jobs",
        "type": "reports:monitor",
      }
    `);
  });

  it('Instance start', () => {
    const mockTaskManager = taskManagerMock.createStart();
    const task = new MonitorReportsTask(mockReporting, configType, logger);
    expect(task.init(mockTaskManager));
    expect(task.getStatus()).toBe('initialized');
  });

  it('create task runner', async () => {
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new MonitorReportsTask(mockReporting, configType, logger);
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
});
