/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';
import { TaskManagerPlugin, TaskManagerStartContract } from '../plugin';
import { injectTask, retry, setupTestServers } from './lib';
import { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { CreateWorkloadAggregatorOpts } from '../monitoring/workload_statistics';

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

const { createWorkloadAggregator: createWorkloadAggregatorMock } = jest.requireMock(
  '../monitoring/workload_statistics'
);
jest.mock('../monitoring/workload_statistics', () => {
  const actual = jest.requireActual('../monitoring/workload_statistics');
  return {
    ...actual,
    createWorkloadAggregator: jest.fn().mockImplementation((opts) => {
      return new actual.createWorkloadAggregator(opts);
    }),
  };
});

describe('unrecognized task types', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let createWorkloadAggregatorOpts: CreateWorkloadAggregatorOpts;

  const taskIdsToRemove: string[] = [];

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        task_manager: {
          monitored_aggregated_stats_refresh_rate: 5000,
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(createWorkloadAggregatorMock).toHaveBeenCalledTimes(1);
    createWorkloadAggregatorOpts = createWorkloadAggregatorMock.mock.calls[0][0];
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    while (taskIdsToRemove.length > 0) {
      const id = taskIdsToRemove.pop();
      await taskManagerPlugin.removeIfExists(id!);
    }
  });

  test('should be no workload aggregator errors when there are removed task types', async () => {
    const errorLogSpy = jest.spyOn(createWorkloadAggregatorOpts.logger, 'error');
    const removeTypeId = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: removeTypeId,
      taskType: 'sampleTaskRemovedType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    const notRegisteredTypeId = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: notRegisteredTypeId,
      taskType: 'sampleTaskNotRegisteredType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    taskIdsToRemove.push(removeTypeId);
    taskIdsToRemove.push(notRegisteredTypeId);

    await retry(async () => {
      const task = await getTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser);
      expect(task?._source?.task?.status).toBe('unrecognized');
    });

    // monitored_aggregated_stats_refresh_rate is set to the minimum of 5 seconds
    // so we want to wait that long to let it refresh
    await new Promise((r) => setTimeout(r, 5100));

    expect(errorLogSpy).not.toHaveBeenCalled();
  });
});

async function getTask(esClient: ElasticsearchClient) {
  const response = await esClient.search<{ task: ConcreteTaskInstance }>({
    index: '.kibana_task_manager',
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'task.taskType': 'sampleTaskRemovedType',
              },
            },
          ],
        },
      },
    },
  });

  return response.hits.hits[0];
}
