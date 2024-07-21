/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign } from 'lodash';

import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { ProductLine, ProductTier } from '../../common/product';

import { usageReportingService } from '../common/services';
import type { ServerlessSecurityConfig } from '../config';
import type { SecurityUsageReportingTaskSetupContract, UsageRecord } from '../types';

import { SecurityUsageReportingTask } from './usage_reporting_task';
import { endpointMeteringService } from '../endpoint/services';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { USAGE_SERVICE_USAGE_URL } from '../constants';

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
  let reportUsageSpy: jest.SpyInstance;
  let meteringCallbackMock: jest.Mock;
  let taskArgs: SecurityUsageReportingTaskSetupContract;
  let usageRecord: UsageRecord;

  function buildMockTaskInstance(overrides?: Partial<ConcreteTaskInstance>): ConcreteTaskInstance {
    const timestamp = new Date(new Date().setMinutes(-15)).toISOString();
    return assign(
      {
        id: `${TYPE}:${VERSION}`,
        runAt: timestamp,
        attempts: 0,
        ownerId: '',
        status: TaskStatus.Running,
        startedAt: timestamp,
        scheduledAt: timestamp,
        retryAt: timestamp,
        params: {},
        state: {
          lastSuccessfulReport: timestamp,
        },
        taskType: TYPE,
      },
      overrides
    );
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

  function buildTaskArgs(
    overrides?: Partial<SecurityUsageReportingTaskSetupContract>
  ): SecurityUsageReportingTaskSetupContract {
    return assign(
      {
        core: mockCore,
        logFactory: loggingSystemMock.create(),
        config: {
          productTypes: [
            {
              product_line: ProductLine.security,
              product_tier: ProductTier.complete,
            },
          ],
        } as ServerlessSecurityConfig,
        taskManager: mockTaskManagerSetup,
        cloudSetup: {
          serverless: {
            projectId: PROJECT_ID,
          },
        } as CloudSetup,
        taskType: TYPE,
        taskTitle: TITLE,
        version: VERSION,
        meteringCallback: meteringCallbackMock,
      },
      overrides
    );
  }

  async function runTask(taskInstance = buildMockTaskInstance(), callNum: number = 0) {
    const mockTaskManagerStart = tmStartMock();
    await mockTask.start({ taskManager: mockTaskManagerStart, interval: '5m' });
    const createTaskRunner =
      mockTaskManagerSetup.registerTaskDefinitions.mock.calls[callNum][0][TYPE].createTaskRunner;
    const taskRunner = createTaskRunner({ taskInstance });
    return taskRunner.run();
  }

  async function setupBaseMocks() {
    mockCore = coreSetupMock();
    mockEsClient = (await mockCore.getStartServices())[0].elasticsearch.client
      .asInternalUser as jest.Mocked<ElasticsearchClient>;
    mockTaskManagerSetup = tmSetupMock();
    usageRecord = buildUsageRecord();
    reportUsageSpy = jest.spyOn(usageReportingService, 'reportUsage');
  }

  describe('meteringCallback integration', () => {
    async function setupMocks() {
      await setupBaseMocks();
      taskArgs = buildTaskArgs({
        meteringCallback: endpointMeteringService.getUsageRecords,
        config: {
          productTypes: [
            { product_line: ProductLine.endpoint, product_tier: ProductTier.complete },
          ],
          usageReportingApiUrl: USAGE_SERVICE_USAGE_URL,
        } as ServerlessSecurityConfig,
      });
      mockTask = new SecurityUsageReportingTask(taskArgs);
    }
    beforeEach(async () => {
      await setupMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('Multiple batches', () => {
      async function runTasksUntilNoRunAt() {
        let task = await runTask();
        while (task?.runAt !== undefined) {
          task = await runTask({ ...buildMockTaskInstance({ runAt: task.runAt }) });
        }
      }

      const heartBeats = Array.from({ length: 2001 }, (_, i) => ({
        _source: {
          agent: {
            id: `test-${i}`,
          },
          event: {
            ingested: '2021-09-01T00:00:00.000Z',
          },
        },
      }));

      const batches = [
        heartBeats.slice(0, 1000),
        heartBeats.slice(1000, 2000),
        heartBeats.slice(2000),
      ];

      it('properly reports multiple batches', async () => {
        batches.forEach((batch) => {
          mockEsClient.search.mockResolvedValueOnce({
            hits: {
              hits: batch,
            },
          } as SearchResponse);
        });

        await runTasksUntilNoRunAt();

        expect(reportUsageSpy).toHaveBeenCalledTimes(3);
        batches.forEach((batch, i) => {
          expect(reportUsageSpy).toHaveBeenNthCalledWith(
            i + 1,
            expect.arrayContaining(
              batch.map(({ _source }) =>
                expect.objectContaining({
                  id: `endpoint-${_source.agent.id}-2021-09-01T00:00:00.000Z`,
                })
              )
            ),
            USAGE_SERVICE_USAGE_URL
          );
        });
      });
    });
  });

  describe('Mocked meteringCallback', () => {
    async function setupMocks() {
      await setupBaseMocks();
      meteringCallbackMock = jest.fn().mockResolvedValueOnce({
        latestRecordTimestamp: usageRecord.usage_timestamp,
        records: [usageRecord],
        shouldRunAgain: false,
      });
      taskArgs = buildTaskArgs({
        config: {
          usageReportingApiUrl: USAGE_SERVICE_USAGE_URL,
        } as ServerlessSecurityConfig,
      });
      mockTask = new SecurityUsageReportingTask(taskArgs);
    }

    beforeEach(async () => {
      await setupMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
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
      it('should call metering callback', async () => {
        const task = await runTask();
        expect(meteringCallbackMock).toHaveBeenCalledWith(
          expect.objectContaining({
            esClient: mockEsClient,
            cloudSetup: taskArgs.cloudSetup,
            taskId: TASK_ID,
            config: taskArgs.config,
            lastSuccessfulReport: new Date(task?.state.lastSuccessfulReport as string),
          })
        );
      });

      it('should report metering records', async () => {
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
          ]),
          USAGE_SERVICE_USAGE_URL
        );
      });

      it('should do nothing if task instance id is outdated', async () => {
        const result = await runTask({ ...buildMockTaskInstance(), id: 'old-id' });

        expect(result).toEqual(getDeleteTaskRunResult());

        expect(reportUsageSpy).not.toHaveBeenCalled();
        expect(meteringCallbackMock).not.toHaveBeenCalled();
      });
      describe('lastSuccessfulReport', () => {
        it('should set lastSuccessfulReport correctly if report success', async () => {
          reportUsageSpy.mockResolvedValueOnce({ status: 201 });
          const taskInstance = buildMockTaskInstance();
          const task = await runTask(taskInstance);
          const newLastSuccessfulReport = task?.state.lastSuccessfulReport;
          expect(newLastSuccessfulReport).toEqual(expect.any(String));
          expect(newLastSuccessfulReport).not.toEqual(taskInstance.state.lastSuccessfulReport);
        });

        it('should set lastSuccessfulReport correctly if no usage records found', async () => {
          meteringCallbackMock.mockResolvedValueOnce([]);
          const taskInstance = buildMockTaskInstance({ state: { lastSuccessfulReport: null } });
          const task = await runTask(taskInstance);
          const newLastSuccessfulReport = task?.state.lastSuccessfulReport;
          expect(newLastSuccessfulReport).toEqual(expect.any(String));
          expect(newLastSuccessfulReport).not.toEqual(taskInstance.state.lastSuccessfulReport);
        });

        describe('and response is NOT 201', () => {
          beforeEach(() => {
            reportUsageSpy.mockResolvedValueOnce({ status: 500 });
          });

          it('should set lastSuccessfulReport correctly', async () => {
            const lastSuccessfulReport = new Date(new Date().setMinutes(-15)).toISOString();
            const taskInstance = buildMockTaskInstance({ state: { lastSuccessfulReport } });
            const task = await runTask(taskInstance);
            const newLastSuccessfulReport = task?.state.lastSuccessfulReport;

            expect(newLastSuccessfulReport).toEqual(taskInstance.state.lastSuccessfulReport);
          });

          it('should set lastSuccessfulReport correctly if previously null', async () => {
            const taskInstance = buildMockTaskInstance({ state: { lastSuccessfulReport: null } });
            const task = await runTask(taskInstance);
            const newLastSuccessfulReport = task?.state.lastSuccessfulReport;

            expect(newLastSuccessfulReport).toEqual(expect.any(String));
          });
        });
      });
    });
  });
});
