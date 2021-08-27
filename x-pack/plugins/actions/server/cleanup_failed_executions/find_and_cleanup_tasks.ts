/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { CoreStart } from '../../../../../src/core/server';
import { nodeBuilder } from '../../../../../src/plugins/data/common/es_query';
import type { TaskInstance } from '../../../task_manager/server/task';
import type { ActionsConfig } from '../config';
import type { ActionsPluginsStart } from '../plugin';
import type { ActionTypeRegistryContract } from '../types';
import type { CleanupTasksResult } from './cleanup_tasks';
import { cleanupTasks } from './cleanup_tasks';

export interface FindAndCleanupTasksOpts {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>;
  config: ActionsConfig['cleanupFailedExecutionsTask'];
  kibanaIndex: string;
  taskManagerIndex: string;
}

export interface FindAndCleanupTasksResult extends CleanupTasksResult {
  remaining: number;
}

export async function findAndCleanupTasks({
  logger,
  actionTypeRegistry,
  coreStartServices,
  config,
  kibanaIndex,
  taskManagerIndex,
}: FindAndCleanupTasksOpts): Promise<FindAndCleanupTasksResult> {
  logger.debug('Starting cleanup of failed executions');
  const [{ savedObjects, elasticsearch }, { spaces }] = await coreStartServices;
  const esClient = elasticsearch.client.asInternalUser;
  const savedObjectsClient = savedObjects.createInternalRepository(['task']);
  const savedObjectsSerializer = savedObjects.createSerializer();

  const result = await savedObjectsClient.find<TaskInstance>({
    type: 'task',
    filter: nodeBuilder.and([
      nodeBuilder.is('task.attributes.status', 'failed'),
      nodeBuilder.or(
        actionTypeRegistry
          .list()
          .map((actionType) =>
            nodeBuilder.is('task.attributes.taskType', `actions:${actionType.id}`)
          )
      ),
    ]),
    page: 1,
    perPage: config.pageSize,
    sortField: 'runAt',
    sortOrder: 'asc',
  });

  logger.debug(
    `Removing ${result.saved_objects.length} of ${result.total} failed execution task(s)`
  );
  const cleanupResult = await cleanupTasks({
    logger,
    esClient,
    spaces,
    kibanaIndex,
    taskManagerIndex,
    savedObjectsSerializer,
    tasks: result.saved_objects,
  });
  logger.debug(
    `Finished cleanup of failed executions. [success=${cleanupResult.successCount}, failures=${cleanupResult.failureCount}]`
  );
  return {
    ...cleanupResult,
    remaining: result.total - cleanupResult.successCount,
  };
}
