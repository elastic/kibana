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
import { ActionTypeRegistryContract } from '../types';
import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { cleanupTasks } from './cleanup_tasks';

export interface TaskRunnerOpts {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>;
  config: ActionsConfig['cleanupFailedExecutionsTask'];
  kibanaIndex: string;
  taskManagerIndex: string;
}

export function taskRunner({
  logger,
  actionTypeRegistry,
  coreStartServices,
  config,
  kibanaIndex,
  taskManagerIndex,
}: TaskRunnerOpts) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
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
        const success = await cleanupTasks({
          logger,
          esClient,
          spaces,
          kibanaIndex,
          taskManagerIndex,
          savedObjectsSerializer,
          tasks: result.saved_objects,
        });
        logger.debug(
          `Finished cleanup of failed executions by removing ${
            result.saved_objects.length
          } task(s)${!success ?? ' with some failures'}`
        );

        return {
          state: {
            runs: state.runs + 1,
            total_cleaned_up: state.total_cleaned_up + result.saved_objects.length,
          },
          schedule: {
            interval: asInterval(config.interval.asMilliseconds()),
          },
        };
      },
    };
  };
}
