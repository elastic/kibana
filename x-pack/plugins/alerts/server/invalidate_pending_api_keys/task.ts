/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ISavedObjectsRepository } from 'kibana/server';
import { InvalidateAPIKeyParams } from '../../../security/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { InvalidateAPIKeyResult } from '../alerts_client';
import { AlertsConfig } from '../config';
import { InvalidatePendingApiKey } from '../types';

const TASK_TYPE = 'alerts_invalidate_api_keys';
export const TASK_ID = `Alerts-${TASK_TYPE}`;

export function initializeAlertsInvalidateApiKeys(
  logger: Logger,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>,
  taskManager: TaskManagerSetupContract,
  invalidateAPIKey: (params: InvalidateAPIKeyParams) => Promise<InvalidateAPIKeyResult>
) {
  registerAlertsInvalidateApiKeysTask(
    logger,
    internalSavedObjectsRepository,
    taskManager,
    invalidateAPIKey
  );
}

export function scheduleAlertsInvalidateApiKeys(
  logger: Logger,
  config: Promise<AlertsConfig>,
  taskManager?: TaskManagerStartContract
) {
  if (taskManager) {
    scheduleTasks(logger, taskManager, config);
  }
}

function registerAlertsInvalidateApiKeysTask(
  logger: Logger,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>,
  taskManager: TaskManagerSetupContract,
  invalidateAPIKey: (params: InvalidateAPIKeyParams) => Promise<InvalidateAPIKeyResult>
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate Alerts API Keys',
      createTaskRunner: taskRunner(logger, internalSavedObjectsRepository, invalidateAPIKey),
    },
  });
}

async function scheduleTasks(
  logger: Logger,
  taskManager: TaskManagerStartContract,
  config: Promise<AlertsConfig>
) {
  const interval = (await config).invalidateApiKeysTask.interval;
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval,
      },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

function taskRunner(
  logger: Logger,
  internalSavedObjectsRepository: Promise<{
    createInternalRepository: () => ISavedObjectsRepository;
  }>,
  invalidateAPIKey: (params: InvalidateAPIKeyParams) => Promise<InvalidateAPIKeyResult>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          const repository = (await internalSavedObjectsRepository).createInternalRepository();
          const res = await repository.find<InvalidatePendingApiKey>({
            type: 'invalidatePendingApiKey',
          });
          res.saved_objects.forEach(async (obj) => {
            const response = await invalidateAPIKey({ id: obj.attributes.apiKeyId });
            if (response.apiKeysEnabled === true && response.result.error_count > 0) {
              logger.error(`Failed to invalidate API Key [id="${obj.attributes.apiKeyId}"]`);
            } else {
              try {
                await repository.delete('invalidatePendingApiKey', obj.id);
              } catch (err) {
                // Skip the cleanup error
                logger.error(
                  `Failed to cleanup api key "${obj.attributes.apiKeyId}". Error: ${err.message}`
                );
              }
            }
          });
          // TODO: clean all
          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_removed: 0,
            },
          };
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_removed: 0,
            },
          };
        }
      },
    };
  };
}
