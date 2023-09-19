/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { ProductLine, ProductTier } from '../../common/product';

import { usageReportingService } from '../common/services';
import type { ServerlessSecurityConfig } from '../config';
import type {
  SecurityUsageReportingTaskSetupContract,
  UsageRecord,
  MeteringCallback,
} from '../types';

import { SecurityUsageReportingTask } from './usage_reporting_task';

describe('SecurityUsageReportingTask', () => {
  const TITLE = 'test-task-title';
  const TYPE = 'test-task-type';
  const VERSION = 'test-task-version';
  const TASK_ID = `${TYPE}:${VERSION}`;
  const USAGE_TYPE = 'test-usage-type';
  const PROJECT_ID = 'test-project-id';

  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;

  let mockTask: SecurityUsageReportingTask;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockCore: CoreSetup;
  let mockTaskManagerSetup: jest.Mocked<TaskManagerSetupContract>;
  let meteringCallbackMock: jest.Mock;
  let taskArgs: SecurityUsageReportingTaskSetupContract;
  let usageRecord: UsageRecord;

  function buildMockTaskInstance() {
    return {
      id: `${TYPE}:${VERSION}`,
      runAt: new Date(),
      attempts: 0,
      ownerId: '',
      status: TaskStatus.Running,
      startedAt: new Date(),
      scheduledAt: new Date(),
      retryAt: new Date(),
      params: {},
      state: {
        lastSuccessfulReport: new Date().toISOString(),
      },
      taskType: TYPE,
    };
  }

  function buildUsageRecord() {
    const ts = new Date().toISOString();
    return {
      id: `endpoint-agentId-${ts}`,
      usage_timestamp: ts,
      creation_timestamp: ts,
      usage: {
        type: USAGE_TYPE,
        period_seconds: 3600,
        quantity: 1,
      },
      source: {
        id: TASK_ID,
        instance_group_id: PROJECT_ID,
        metadata: {
          tier: ProductTier.complete,
        },
      },
    };
  }

  function buildTaskArgs({
    core,
    taskManager,
    meteringCallback,
  }: {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    meteringCallback: MeteringCallback;
  }): SecurityUsageReportingTaskSetupContract {
    return {
      core,
      logFactory: loggingSystemMock.create(),
      config: {
        productTypes: [
          {
            product_line: ProductLine.security,
            product_tier: ProductTier.complete,
          },
        ],
      } as ServerlessSecurityConfig,
      taskManager,
      cloudSetup: {
        serverless: {
          projectId: PROJECT_ID,
        },
      } as CloudSetup,
      taskType: TYPE,
      taskTitle: TITLE,
      version: VERSION,
      meteringCallback,
    };
  }

  beforeEach(async () => {
    mockCore = coreSetupMock();
    mockEsClient = (await mockCore.getStartServices())[0].elasticsearch.client
      .asInternalUser as jest.Mocked<ElasticsearchClient>;
    mockTaskManagerSetup = tmSetupMock();
    usageRecord = buildUsageRecord();
    meteringCallbackMock = jest.fn().mockResolvedValueOnce([usageRecord]);
    taskArgs = buildTaskArgs({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      meteringCallback: meteringCallbackMock,
    });
    mockTask = new SecurityUsageReportingTask(taskArgs);
  });

  describe('task lifecycle', () => {
    it('should create task', () => {
      expect(mockTask).toBeInstanceOf(SecurityUsageReportingTask);
    });

    it('should register task', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('should schedule task', async () => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart, interval: '5m' });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });
  });

  describe('task logic', () => {
    async function runTask(taskInstance = buildMockTaskInstance()) {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart, interval: '5m' });
      const createTaskRunner =
        mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance });
      return taskRunner.run();
    }

    it('should call metering callback', async () => {
      const task = await runTask();
      expect(meteringCallbackMock).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: mockEsClient,
          cloudSetup: taskArgs.cloudSetup,
          taskId: TASK_ID,
          config: taskArgs.config,
          lastSuccessfulReport: task?.state.lastSuccessfulReport,
        })
      );
    });

    it('should report metering records', async () => {
      const reportUsageSpy = jest.spyOn(usageReportingService, 'reportUsage');
      await runTask();
      expect(reportUsageSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            creation_timestamp: usageRecord.creation_timestamp,
            id: usageRecord.id,
            source: {
              id: TASK_ID,
              instance_group_id: PROJECT_ID,
              metadata: { tier: ProductTier.complete },
            },
            usage: { period_seconds: 3600, quantity: 1, type: USAGE_TYPE },
            usage_timestamp: usageRecord.usage_timestamp,
          }),
        ])
      );
    });
  });
});
