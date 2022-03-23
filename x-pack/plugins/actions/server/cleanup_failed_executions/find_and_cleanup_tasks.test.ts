/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { toElasticsearchQuery } from '@kbn/es-query';
import { ActionsConfig } from '../config';
import { ActionsPluginsStart } from '../plugin';
import { spacesMock } from '../../../spaces/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
} from '../../../../../src/core/server/mocks';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { FindAndCleanupTasksOpts, findAndCleanupTasks } from './find_and_cleanup_tasks';

jest.mock('./cleanup_tasks', () => ({
  cleanupTasks: jest.fn(),
}));

describe('findAndCleanupTasks', () => {
  const logger = loggingSystemMock.create().get();
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const savedObjectsRepository = savedObjectsRepositoryMock.create();
  const esStart = elasticsearchServiceMock.createStart();
  const spaces = spacesMock.createStart();
  const soService = savedObjectsServiceMock.createStartContract();
  const coreStartServices = Promise.resolve([
    {
      savedObjects: {
        ...soService,
        createInternalRepository: () => savedObjectsRepository,
      },
      elasticsearch: esStart,
    },
    {
      spaces,
    },
    {},
  ]) as unknown as Promise<[CoreStart, ActionsPluginsStart, unknown]>;

  const config: ActionsConfig['cleanupFailedExecutionsTask'] = {
    enabled: true,
    cleanupInterval: schema.duration().validate('5m'),
    idleInterval: schema.duration().validate('1h'),
    pageSize: 100,
  };

  const findAndCleanupTasksOpts: FindAndCleanupTasksOpts = {
    logger,
    actionTypeRegistry,
    coreStartServices,
    config,
    kibanaIndex: '.kibana',
    taskManagerIndex: '.kibana_task_manager',
  };

  beforeEach(() => {
    actionTypeRegistry.list.mockReturnValue([
      {
        id: 'my-action-type',
        name: 'My action type',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      },
    ]);
    jest.requireMock('./cleanup_tasks').cleanupTasks.mockResolvedValue({
      success: true,
      successCount: 0,
      failureCount: 0,
    });
    savedObjectsRepository.find.mockResolvedValue({
      total: 0,
      page: 1,
      per_page: 10,
      saved_objects: [],
    });
  });

  it('should call the find function with proper parameters', async () => {
    await findAndCleanupTasks(findAndCleanupTasksOpts);
    expect(savedObjectsRepository.find).toHaveBeenCalledWith({
      type: 'task',
      filter: expect.any(Object),
      page: 1,
      perPage: config.pageSize,
      sortField: 'runAt',
      sortOrder: 'asc',
    });
    expect(toElasticsearchQuery(savedObjectsRepository.find.mock.calls[0][0].filter))
      .toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "task.attributes.status": "failed",
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "task.attributes.taskType": "actions:my-action-type",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  it('should call the cleanupTasks function with proper parameters', async () => {
    await findAndCleanupTasks(findAndCleanupTasksOpts);
    expect(jest.requireMock('./cleanup_tasks').cleanupTasks).toHaveBeenCalledWith({
      logger: findAndCleanupTasksOpts.logger,
      esClient: esStart.client.asInternalUser,
      spaces,
      kibanaIndex: findAndCleanupTasksOpts.kibanaIndex,
      taskManagerIndex: findAndCleanupTasksOpts.taskManagerIndex,
      savedObjectsSerializer: soService.createSerializer(),
      tasks: [],
    });
  });

  it('should return the cleanup result', async () => {
    const result = await findAndCleanupTasks(findAndCleanupTasksOpts);
    expect(result).toEqual({
      success: true,
      successCount: 0,
      failureCount: 0,
      remaining: 0,
    });
  });

  it('should log a message before cleaning up tasks', async () => {
    await findAndCleanupTasks(findAndCleanupTasksOpts);
    expect(logger.debug).toHaveBeenCalledWith('Removing 0 of 0 failed execution task(s)');
  });

  it('should log a message after cleaning up tasks', async () => {
    await findAndCleanupTasks(findAndCleanupTasksOpts);
    expect(logger.debug).toHaveBeenCalledWith(
      'Finished cleanup of failed executions. [success=0, failures=0]'
    );
  });
});
