/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { CoreStart } from '@kbn/core-lifecycle-server';
import { TaskScheduling } from '../task_scheduling';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { BackgroundTaskNode } from '../saved_objects/schemas/background_task_node';
import { BACKGROUND_TASK_NODE_SO_NAME } from '../saved_objects';
import { TaskManagerStartContract } from '..';

const TASK_TYPE = 'remove_inactive_background_task_nodes';
export const TASK_ID = `task_manager-${TASK_TYPE}`;

export const CLEANUP_INTERVAL = '1m';
export const CLEANUP_LOOKBACK = '5m';

export async function scheduleRemoveInactiveNodesTaskDefinition(
  logger: Logger,
  taskScheduling: TaskScheduling
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: CLEANUP_INTERVAL,
      },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}

export function registerRemoveInactiveNodesTaskDefinition(
  logger: Logger,
  coreStartServices: () => Promise<[CoreStart, TaskManagerStartContract, unknown]>,
  taskTypeDictionary: TaskTypeDictionary
) {
  taskTypeDictionary.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Remove inactive background task nodes',
      createTaskRunner: taskRunner(logger, coreStartServices),
    },
  });
}

export function taskRunner(
  logger: Logger,
  coreStartServices: () => Promise<[CoreStart, TaskManagerStartContract, unknown]>
) {
  return () => {
    return {
      async run() {
        try {
          const [{ savedObjects }] = await coreStartServices();
          const savedObjectsRepository = savedObjects.createInternalRepository([
            BACKGROUND_TASK_NODE_SO_NAME,
          ]);

          const { saved_objects: inactiveNodes } =
            await savedObjectsRepository.find<BackgroundTaskNode>({
              type: BACKGROUND_TASK_NODE_SO_NAME,
              perPage: 10000,
              page: 1,
              filter: `${BACKGROUND_TASK_NODE_SO_NAME}.attributes.last_seen < now-${CLEANUP_LOOKBACK}`,
            });

          if (inactiveNodes.length > 0) {
            const nodesToDelete = inactiveNodes.map((node) => ({
              type: BACKGROUND_TASK_NODE_SO_NAME,
              id: node.attributes.id,
            }));
            await savedObjectsRepository.bulkDelete(nodesToDelete, {
              force: true,
              refresh: false,
            });

            const deletedNodes = nodesToDelete.map((node) => node.id);
            logger.info(`Inactive Kibana nodes: ${deletedNodes}, have been successfully deleted`);
          }

          return {
            state: {},
            schedule: {
              interval: CLEANUP_INTERVAL,
            },
          };
        } catch (e) {
          logger.error(`Deleting inactive nodes failed. Error: ${e.message} `);
          return {
            state: {},
            schedule: {
              interval: CLEANUP_INTERVAL,
            },
          };
        }
      },
    };
  };
}
