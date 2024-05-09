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
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { InvalidateAPIKeysParams, SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  AggregationsStringTermsBucketKeys,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { InvalidateAPIKeyResult } from '../rules_client';
import { AlertingConfig } from '../config';
import { timePeriodBeforeDate } from '../lib/get_cadence';
import { AlertingPluginsStart } from '../plugin';
import { InvalidatePendingApiKey } from '../types';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import { AdHocRunSO } from '../data/ad_hoc_run/types';

const TASK_TYPE = 'alerts_invalidate_api_keys';
const PAGE_SIZE = 100;
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
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
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
      stateSchemaByVersion,
      createTaskRunner: taskRunner(logger, coreStartServices, config),
    },
  });
}

export function taskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: AlertingConfig
) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;
    return {
      async run() {
        let totalInvalidated = 0;
        try {
          const [{ savedObjects }, { encryptedSavedObjects, security }] = await coreStartServices;
          const savedObjectsClient = savedObjects.createInternalRepository([
            API_KEY_PENDING_INVALIDATION_TYPE,
            AD_HOC_RUN_SAVED_OBJECT_TYPE,
          ]);
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
          });

          totalInvalidated = await runInvalidate({
            config,
            encryptedSavedObjectsClient,
            logger,
            savedObjectsClient,
            security,
          });

          const updatedState: LatestTaskStateSchema = {
            runs: (state.runs || 0) + 1,
            total_invalidated: totalInvalidated,
          };
          return {
            state: updatedState,
            schedule: {
              interval: config.invalidateApiKeysTask.interval,
            },
          };
        } catch (e) {
          logger.warn(`Error executing alerting apiKey invalidation task: ${e.message}`);
          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            total_invalidated: totalInvalidated,
          };
          return {
            state: updatedState,
            schedule: {
              interval: config.invalidateApiKeysTask.interval,
            },
          };
        }
      },
    };
  };
}

interface ApiKeyIdAndSOId {
  id: string;
  apiKeyId: string;
}

interface RunInvalidateOpts {
  config: AlertingConfig;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  security?: SecurityPluginStart;
}
export async function runInvalidate({
  config,
  encryptedSavedObjectsClient,
  logger,
  savedObjectsClient,
  security,
}: RunInvalidateOpts) {
  const configuredDelay = config.invalidateApiKeysTask.removalDelay;
  const delay: string = timePeriodBeforeDate(new Date(), configuredDelay).toISOString();

  let hasMoreApiKeysPendingInvalidation = true;
  let totalInvalidated = 0;
  const excludedSOIds = new Set<string>();

  do {
    // Query for PAGE_SIZE api keys to invalidate at a time. At the end of each iteration,
    // we should have deleted the deletable keys and added keys still in use to the excluded list
    const filter = getFindFilter(delay, [...excludedSOIds]);
    const apiKeysToInvalidate = await savedObjectsClient.find<InvalidatePendingApiKey>({
      type: API_KEY_PENDING_INVALIDATION_TYPE,
      filter,
      page: 1,
      sortField: 'createdAt',
      sortOrder: 'asc',
      perPage: PAGE_SIZE,
    });

    if (apiKeysToInvalidate.total > 0) {
      const { apiKeyIdsToExclude, apiKeyIdsToInvalidate } = await getApiKeyIdsToInvalidate({
        apiKeySOsPendingInvalidation: apiKeysToInvalidate,
        encryptedSavedObjectsClient,
        savedObjectsClient,
      });
      apiKeyIdsToExclude.forEach(({ id }) => excludedSOIds.add(id));
      totalInvalidated += await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate,
        logger,
        savedObjectsClient,
        securityPluginStart: security,
      });
    }

    hasMoreApiKeysPendingInvalidation = apiKeysToInvalidate.total > PAGE_SIZE;
  } while (hasMoreApiKeysPendingInvalidation);

  return totalInvalidated;
}
interface GetApiKeyIdsToInvalidateOpts {
  apiKeySOsPendingInvalidation: SavedObjectsFindResponse<InvalidatePendingApiKey>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
}

interface GetApiKeysToInvalidateResult {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  apiKeyIdsToExclude: ApiKeyIdAndSOId[];
}

export async function getApiKeyIdsToInvalidate({
  apiKeySOsPendingInvalidation,
  encryptedSavedObjectsClient,
  savedObjectsClient,
}: GetApiKeyIdsToInvalidateOpts): Promise<GetApiKeysToInvalidateResult> {
  // Decrypt the apiKeyId for each pending invalidation SO
  const apiKeyIds = await Promise.all(
    apiKeySOsPendingInvalidation.saved_objects.map(async (apiKeyPendingInvalidationSO) => {
      const decryptedApiKeyPendingInvalidationObject =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<InvalidatePendingApiKey>(
          API_KEY_PENDING_INVALIDATION_TYPE,
          apiKeyPendingInvalidationSO.id
        );
      return {
        id: decryptedApiKeyPendingInvalidationObject.id,
        apiKeyId: decryptedApiKeyPendingInvalidationObject.attributes.apiKeyId,
      };
    })
  );

  // Query saved objects index to see if any API keys are in use
  const filter = `${apiKeyIds
    .map(({ apiKeyId }) => `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.apiKeyId: "${apiKeyId}"`)
    .join(' OR ')}`;
  const { aggregations } = await savedObjectsClient.find<
    AdHocRunSO,
    { apiKeyId: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys> }
  >({
    type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    filter,
    perPage: 0,
    namespaces: ['*'],
    aggs: {
      apiKeyId: {
        terms: {
          field: `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.apiKeyId`,
          size: PAGE_SIZE,
        },
      },
    },
  });

  const apiKeyIdsInUseBuckets: AggregationsStringTermsBucketKeys[] =
    (aggregations?.apiKeyId?.buckets as AggregationsStringTermsBucketKeys[]) ?? [];

  const apiKeyIdsToInvalidate: ApiKeyIdAndSOId[] = [];
  const apiKeyIdsToExclude: ApiKeyIdAndSOId[] = [];
  apiKeyIds.forEach(({ id, apiKeyId }) => {
    if (apiKeyIdsInUseBuckets.find((bucket) => bucket.key === apiKeyId)) {
      apiKeyIdsToExclude.push({ id, apiKeyId });
    } else {
      apiKeyIdsToInvalidate.push({ id, apiKeyId });
    }
  });

  return { apiKeyIdsToInvalidate, apiKeyIdsToExclude };
}

export function getFindFilter(delay: string, excludedSOIds: string[] = []): string {
  let filter = `${API_KEY_PENDING_INVALIDATION_TYPE}.attributes.createdAt <= "${delay}"`;
  if (excludedSOIds.length > 0) {
    const excluded = [...new Set(excludedSOIds)];
    const excludedSOIdFilter = (excluded ?? []).map(
      (id: string) =>
        `NOT ${API_KEY_PENDING_INVALIDATION_TYPE}.id: "${API_KEY_PENDING_INVALIDATION_TYPE}:${id}"`
    );
    filter += ` AND ${excludedSOIdFilter.join(' AND ')}`;
  }
  return filter;
}

interface InvalidateApiKeysAndDeleteSO {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  securityPluginStart?: SecurityPluginStart;
}

export async function invalidateApiKeysAndDeletePendingApiKeySavedObject({
  apiKeyIdsToInvalidate,
  logger,
  savedObjectsClient,
  securityPluginStart,
}: InvalidateApiKeysAndDeleteSO) {
  let totalInvalidated = 0;
  if (apiKeyIdsToInvalidate.length > 0) {
    const ids = apiKeyIdsToInvalidate.map(({ apiKeyId }) => apiKeyId);
    const response = await invalidateAPIKeys({ ids }, securityPluginStart);
    if (response.apiKeysEnabled === true && response.result.error_count > 0) {
      logger.error(`Failed to invalidate API Keys [ids="${ids.join(', ')}"]`);
    } else {
      await Promise.all(
        apiKeyIdsToInvalidate.map(async ({ id, apiKeyId }) => {
          try {
            await savedObjectsClient.delete(API_KEY_PENDING_INVALIDATION_TYPE, id);
            totalInvalidated++;
          } catch (err) {
            logger.error(
              `Failed to delete invalidated API key "${apiKeyId}". Error: ${err.message}`
            );
          }
        })
      );
    }
  }
  logger.debug(`Total invalidated API keys "${totalInvalidated}"`);
  return totalInvalidated;
}
