/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  CoreStart,
  SavedObjectsFindResponse,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { InvalidateAPIKeysParams, SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { InvalidateAPIKeyResult } from '../rules_client';
import { AlertingConfig } from '../config';
import { timePeriodBeforeDate } from '../lib/get_cadence';
import { AlertingPluginsStart } from '../plugin';
import { InvalidatePendingApiKey } from '../types';

const TASK_TYPE = 'alerts_invalidate_api_keys';
export const TASK_ID = `Alerts-${TASK_TYPE}`;

const invalidateAPIKeys = async (
  params: InvalidateAPIKeysParams,
  securityPluginStart?: SecurityPluginStart
): Promise<InvalidateAPIKeyResult> => {
  if (!securityPluginStart) {
    return { apiKeysEnabled: false };
  }
  const invalidateAPIKeyResult = await securityPluginStart.authc.apiKeys.invalidateAsInternalUser(
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
  config: AlertingConfig
) {
  registerApiKeyInvalidatorTaskDefinition(logger, coreStartServices, taskManager, config);
}

export async function scheduleApiKeyInvalidatorTask(
  logger: Logger,
  config: AlertingConfig,
  taskManager: TaskManagerStartContract
) {
  const interval = config.invalidateApiKeysTask.interval;
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

function registerApiKeyInvalidatorTaskDefinition(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: AlertingConfig
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate alert API Keys',
      createTaskRunner: taskRunner(logger, coreStartServices, config),
    },
  });
}

function getFakeKibanaRequest(basePath: string) {
  const requestHeaders: Record<string, string> = {};
  return {
    headers: requestHeaders,
    getBasePath: () => basePath,
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown as KibanaRequest;
}

function taskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: AlertingConfig
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        let totalInvalidated = 0;
        try {
          const [{ savedObjects, http }, { encryptedSavedObjects, security }] =
            await coreStartServices;
          const savedObjectsClient = savedObjects.getScopedClient(
            getFakeKibanaRequest(http.basePath.serverBasePath),
            {
              includedHiddenTypes: ['api_key_pending_invalidation'],
              excludedWrappers: ['security'],
            }
          );
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: ['api_key_pending_invalidation'],
          });
          const configuredDelay = config.invalidateApiKeysTask.removalDelay;
          const delay = timePeriodBeforeDate(new Date(), configuredDelay).toISOString();

          let hasApiKeysPendingInvalidation = true;
          const PAGE_SIZE = 100;
          do {
            const apiKeysToInvalidate = await savedObjectsClient.find<InvalidatePendingApiKey>({
              type: 'api_key_pending_invalidation',
              filter: `api_key_pending_invalidation.attributes.createdAt <= "${delay}"`,
              page: 1,
              sortField: 'createdAt',
              sortOrder: 'asc',
              perPage: PAGE_SIZE,
            });
            totalInvalidated += await invalidateApiKeys(
              logger,
              savedObjectsClient,
              apiKeysToInvalidate,
              encryptedSavedObjectsClient,
              security
            );

            hasApiKeysPendingInvalidation = apiKeysToInvalidate.total > PAGE_SIZE;
          } while (hasApiKeysPendingInvalidation);

          return {
            state: {
              runs: (state.runs || 0) + 1,
              total_invalidated: totalInvalidated,
            },
            schedule: {
              interval: config.invalidateApiKeysTask.interval,
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
              interval: config.invalidateApiKeysTask.interval,
            },
          };
        }
      },
    };
  };
}

async function invalidateApiKeys(
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract,
  apiKeysToInvalidate: SavedObjectsFindResponse<InvalidatePendingApiKey>,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  securityPluginStart?: SecurityPluginStart
) {
  let totalInvalidated = 0;
  const apiKeyIds = await Promise.all(
    apiKeysToInvalidate.saved_objects.map(async (apiKeyObj) => {
      const decryptedApiKey =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<InvalidatePendingApiKey>(
          'api_key_pending_invalidation',
          apiKeyObj.id
        );
      return decryptedApiKey.attributes.apiKeyId;
    })
  );
  if (apiKeyIds.length > 0) {
    const response = await invalidateAPIKeys({ ids: apiKeyIds }, securityPluginStart);
    if (response.apiKeysEnabled === true && response.result.error_count > 0) {
      logger.error(`Failed to invalidate API Keys [ids="${apiKeyIds.join(', ')}"]`);
    } else {
      await Promise.all(
        apiKeysToInvalidate.saved_objects.map(async (apiKeyObj) => {
          try {
            await savedObjectsClient.delete('api_key_pending_invalidation', apiKeyObj.id);
            totalInvalidated++;
          } catch (err) {
            logger.error(
              `Failed to delete invalidated API key "${apiKeyObj.attributes.apiKeyId}". Error: ${err.message}`
            );
          }
        })
      );
    }
  }
  logger.debug(`Total invalidated API keys "${totalInvalidated}"`);
  return totalInvalidated;
}
