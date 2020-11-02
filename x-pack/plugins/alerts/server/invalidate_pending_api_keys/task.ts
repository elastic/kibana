/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import moment from 'moment';
import { InvalidateAPIKeyParams, SecurityPluginSetup } from '../../../security/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { InvalidateAPIKeyResult } from '../alerts_client';

const TASK_TYPE = 'alerts_invalidate_api_keys';

const invalidateAPIKey = async (
  params: InvalidateAPIKeyParams,
  securityPluginSetup?: SecurityPluginSetup
): Promise<InvalidateAPIKeyResult> => {
  if (!securityPluginSetup) {
    return { apiKeysEnabled: false };
  }
  const invalidateAPIKeyResult = await securityPluginSetup.authc.invalidateAPIKeyAsInternalUser(
    params
  );
  // Null when Elasticsearch security is disabled
  if (!invalidateAPIKeyResult) {
    return { apiKeysEnabled: false };
  }
  return {
    apiKeysEnabled: true,
    result: invalidateAPIKeyResult,
  };
};

export function initializeAlertsInvalidateApiKeys(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  securityPluginSetup?: SecurityPluginSetup
) {
  registerAlertsInvalidateApiKeysTask(logger, taskManager, securityPluginSetup);
}

function registerAlertsInvalidateApiKeysTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  securityPluginSetup?: SecurityPluginSetup
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate Alerts API Keys',
      createTaskRunner: taskRunner(logger, securityPluginSetup),
    },
  });
}

export async function scheduleAlertsInvalidateApiKeysTask(
  logger: Logger,
  taskManager: TaskManagerStartContract,
  apiKeyId: string
) {
  try {
    await taskManager.schedule({
      taskType: TASK_TYPE,
      params: { apiKeyId },
      state: {},
      scope: ['alerting'],
      // make configurable?
      runAt: moment(new Date()).add(5000, 'milliseconds').toDate(),
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

function taskRunner(logger: Logger, securityPluginSetup?: SecurityPluginSetup) {
  return ({ taskInstance }: RunContext) => {
    const {
      params: { apiKeyId },
    } = taskInstance;
    return {
      async run() {
        try {
          const response = await invalidateAPIKey({ id: apiKeyId }, securityPluginSetup);
          if (response.apiKeysEnabled === true && response.result.error_count > 0) {
            logger.error(`Failed to invalidate API Key [id="${apiKeyId}"]`);
            return {
              state: {
                invalidated: 0,
              },
            };
          }
          return {
            state: {
              invalidated: 1,
            },
          };
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          return {
            state: {
              invalidated: 0,
            },
          };
        }
      },
    };
  };
}
