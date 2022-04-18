/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult, SavedObjectsSerializer } from '@kbn/core/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { CleanupTasksOpts, cleanupTasks } from './cleanup_tasks';
import { TaskInstance } from '@kbn/task-manager-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

describe('cleanupTasks', () => {
  const logger = loggingSystemMock.create().get();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const spaces = spacesMock.createStart();
  const savedObjectsSerializer = {
    generateRawId: jest
      .fn()
      .mockImplementation((namespace: string | undefined, type: string, id: string) => {
        const namespacePrefix = namespace ? `${namespace}:` : '';
        return `${namespacePrefix}${type}:${id}`;
      }),
  } as unknown as SavedObjectsSerializer;

  const cleanupTasksOpts: CleanupTasksOpts = {
    logger,
    esClient,
    spaces,
    savedObjectsSerializer,
    kibanaIndex: '.kibana',
    taskManagerIndex: '.kibana_task_manager',
    tasks: [],
  };

  const taskSO: SavedObjectsFindResult<TaskInstance> = {
    id: '123',
    type: 'task',
    references: [],
    score: 0,
    attributes: {
      id: '123',
      taskType: 'foo',
      scheduledAt: new Date(),
      state: {},
      runAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(),
      ownerId: '234',
      params: { spaceId: undefined, actionTaskParamsId: '123' },
      schedule: { interval: '5m' },
    },
  };

  beforeEach(() => {
    esClient.bulk.mockReset();
  });

  it('should skip cleanup when there are no tasks to cleanup', async () => {
    const result = await cleanupTasks(cleanupTasksOpts);
    expect(result).toEqual({
      success: true,
      successCount: 0,
      failureCount: 0,
    });
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('should delete action_task_params and task objects', async () => {
    esClient.bulk.mockResponse({
      items: [],
      errors: false,
      took: 1,
    } as unknown as estypes.BulkResponse);
    const result = await cleanupTasks({
      ...cleanupTasksOpts,
      tasks: [taskSO],
    });
    expect(esClient.bulk).toHaveBeenCalledWith(
      {
        body: [{ delete: { _index: cleanupTasksOpts.kibanaIndex, _id: 'action_task_params:123' } }],
      },
      { meta: true }
    );
    expect(esClient.bulk).toHaveBeenCalledWith(
      {
        body: [{ delete: { _index: cleanupTasksOpts.taskManagerIndex, _id: 'task:123' } }],
      },
      { meta: true }
    );
    expect(result).toEqual({
      success: true,
      successCount: 1,
      failureCount: 0,
    });
  });

  it('should not delete the task if the action_task_params failed to delete', async () => {
    esClient.bulk.mockResponse({
      items: [
        {
          delete: {
            _index: cleanupTasksOpts.kibanaIndex,
            _id: 'action_task_params:123',
            status: 500,
            result: 'Failure',
            error: true,
          },
        },
      ],
      errors: true,
      took: 1,
    } as unknown as estypes.BulkResponse);
    const result = await cleanupTasks({
      ...cleanupTasksOpts,
      tasks: [taskSO],
    });
    expect(esClient.bulk).toHaveBeenCalledWith(
      {
        body: [{ delete: { _index: cleanupTasksOpts.kibanaIndex, _id: 'action_task_params:123' } }],
      },
      { meta: true }
    );
    expect(esClient.bulk).not.toHaveBeenCalledWith(
      {
        body: [{ delete: { _index: cleanupTasksOpts.taskManagerIndex, _id: 'task:123' } }],
      },
      { meta: true }
    );
    expect(result).toEqual({
      success: false,
      successCount: 0,
      failureCount: 1,
    });
  });
});
