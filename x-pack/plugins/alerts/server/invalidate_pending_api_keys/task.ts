/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  CoreStart,
  SavedObjectsFindResponse,
  ISavedObjectsRepository,
} from 'kibana/server';
import { InvalidateAPIKeyParams, SecurityPluginSetup } from '../../../security/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';
import { InvalidateAPIKeyResult } from '../alerts_client';
import { AlertsConfig } from '../config';
import { timePeriodBeforeDate } from '../lib/get_cadence';
import { AlertingPluginsStart } from '../plugin';
import { InvalidatePendingApiKey } from '../types';

const TASK_TYPE = 'alerts_invalidate_api_keys';
export const TASK_ID = `Alerts-${TASK_TYPE}`;

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

export function initializeApiKeyInvalidator(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: Promise<AlertsConfig>,
  securityPluginSetup?: SecurityPluginSetup
) {
  registerApiKeyInvalitorTaskDefinition(
    logger,
    coreStartServices,
    taskManager,
    config,
    securityPluginSetup
  );
}

export async function scheduleApiKeyInvalidatorTask(
  logger: Logger,
  config: Promise<AlertsConfig>,
  taskManager: TaskManagerStartContract
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

function registerApiKeyInvalitorTaskDefinition(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: Promise<AlertsConfig>,
  securityPluginSetup?: SecurityPluginSetup
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate alert API Keys',
      createTaskRunner: taskRunner(logger, coreStartServices, config, securityPluginSetup),
    },
  });
}

function taskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: Promise<AlertsConfig>,
  securityPluginSetup?: SecurityPluginSetup
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        let totalInvalidated = 0;
        const configResult = await config;
        try {
          const [{ savedObjects }] = await coreStartServices;
          const repository = savedObjects.createInternalRepository([
            'api_key_pending_invalidation',
          ]);
          const configuredDelay = configResult.invalidateApiKeysTask.removalDelay;
          const delay = timePeriodBeforeDate(new Date(), configuredDelay).toISOString();

          let hasApiKeysPendingInvalidation = true;
          const PAGE_SIZE = 100;
          do {
            const apiKeysToInvalidate = await repository.find<InvalidatePendingApiKey>({
              type: 'api_key_pending_invalidation',
              filter: `api_key_pending_invalidation.attributes.createdAt <= "${delay}"`,
              page: 1,
              sortField: 'createdAt',
              sortOrder: 'asc',
              perPage: PAGE_SIZE,
            });
            totalInvalidated += await invalidateApiKeys(
              logger,
              repository,
              apiKeysToInvalidate,
              securityPluginSetup
            );

            hasApiKeysPendingInvalidation = apiKeysToInvalidate.total > PAGE_SIZE;
          } while (hasApiKeysPendingInvalidation);

          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_invalidated: totalInvalidated,
            },
            schedule: {
              interval: configResult.invalidateApiKeysTask.interval,
            },
          };
        } catch (e) {
          logger.warn(`Error executing alerting apiKey invalidation task: ${e.message}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_invalidated: totalInvalidated,
            },
            schedule: {
              interval: configResult.invalidateApiKeysTask.interval,
            },
          };
        }
      },
    };
  };
}

async function invalidateApiKeys(
  logger: Logger,
  repository: ISavedObjectsRepository,
  apiKeysToInvalidate: SavedObjectsFindResponse<InvalidatePendingApiKey>,
  securityPluginSetup?: SecurityPluginSetup
) {
  let totalInvalidated = 0;
  await Promise.all(
    apiKeysToInvalidate.saved_objects.map(async (apiKeyObj) => {
      const response = await invalidateAPIKey(
        { id: apiKeyObj.attributes.apiKeyId },
        securityPluginSetup
      );
      if (response.apiKeysEnabled === true && response.result.error_count > 0) {
        logger.error(`Failed to invalidate API Key [id="${apiKeyObj.attributes.apiKeyId}"]`);
      } else {
        try {
          await repository.delete('api_key_pending_invalidation', apiKeyObj.id);
          totalInvalidated++;
        } catch (err) {
          logger.error(
            `Failed to cleanup api key "${apiKeyObj.attributes.apiKeyId}". Error: ${err.message}`
          );
        }
      }
    })
  );
  return totalInvalidated;
}
