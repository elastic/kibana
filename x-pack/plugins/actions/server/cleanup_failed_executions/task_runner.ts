/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart } from 'kibana/server';
import { ActionsConfig } from '../config';
import { RunContext, TaskInstance, asInterval } from '../../../task_manager/server';
import { ActionsPluginsStart } from '../plugin';
import { ActionTypeRegistry } from '../action_type_registry';
import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { parallelize } from '../lib';

export function taskRunner(
  logger: Logger,
  actionTypeRegistry: ActionTypeRegistry,
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>,
  { interval, pageSize }: ActionsConfig['cleanupFailedExecutionsTask']
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        logger.debug('Starting cleanup of failed executions');
        const [{ savedObjects }, { taskManager }] = await coreStartServices;
        const savedObjectsClient = savedObjects.createInternalRepository([
          'task',
          'action_task_params',
        ]);
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
          perPage: pageSize,
          sortField: 'runAt',
          sortOrder: 'asc',
        });
        const taskIds = result.saved_objects.map(({ id }) => id);
        await parallelize<string>(taskIds, async (taskId) => {
          await taskManager.removeIfExists(taskId);
        });
        const actionTaskParamIds = result.saved_objects.map(
          ({ attributes }) =>
            JSON.parse((attributes.params as unknown) as string).actionTaskParamsId
        );
        await parallelize<string>(actionTaskParamIds, async (actionTaskParamsId) => {
          await savedObjectsClient.delete('action_task_params', actionTaskParamsId);
        });
        logger.debug(`Finished cleanup of failed executions by removing ${taskIds.length} task(s)`);
        return {
          state: {
            runs: state.runs + 1,
            total_cleaned_up: state.total_cleaned_up + taskIds.length,
          },
          schedule: {
            interval: asInterval(interval.asMilliseconds()),
          },
        };
      },
    };
  };
}
