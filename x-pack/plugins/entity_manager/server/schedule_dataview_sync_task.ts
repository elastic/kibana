/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { EntityManagerPluginStartDependencies, EntityManagerServerSetup } from './types';
import { checkIfEntityDiscoveryAPIKeyIsValid, readEntityDiscoveryAPIKey } from './lib/auth';
import { getClientsFromAPIKey } from './lib/utils';
import { findEntityDefinitions } from './lib/entities/find_entity_definition';

const TASK_TYPE = 'entity-manager-dataview-sync-4';
const TASK_ID = `${TASK_TYPE}-task-id`;
const TASK_TIMEOUT = '15m';
const TASK_INTERVAL = '10s';
const TASK_SCOPE = ['securitySolution'];

export interface ScheduleDataviewSyncTaskParams {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: StartServicesAccessor<EntityManagerPluginStartDependencies>;
  // auditLogger: AuditLogger | undefined;
  server: EntityManagerServerSetup;
}

export const scheduleDataviewSyncTask = async ({
  // auditLogger,
  taskManager,
  getStartServices,
  logger,
  server,
}: ScheduleDataviewSyncTaskParams) => {
  console.log(`scheduleDataviewSyncTask "${TASK_TYPE}"`, taskManager);

  if (!taskManager) {
    return;
  }

  console.log(`Register task "${TASK_TYPE}"`);

  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: `Sync dataview index patter with the transform index pattern`,
      timeout: TASK_TIMEOUT,
      createTaskRunner: createMigrationTask({ logger, getStartServices, server }),
    },
  });

  const [coreStart, depsStart] = await getStartServices();
  const taskManagerStart = depsStart.taskManager; // TaskManagerStartContract

  console.log(`Task scheduled: "${TASK_TYPE}"`);

  // const now = new Date();

  try {
    if (taskManagerStart) {
      await taskManagerStart.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_TYPE,
        // scheduledAt: now,
        // runAt: now,
        schedule: {
          interval: TASK_INTERVAL,
        },
        scope: TASK_SCOPE,
        params: {},
        state: {},
      });
    }
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`);
  }
};

export const createMigrationTask =
  ({
    getStartServices,
    logger,
    // esClient,
    // soClient,
    server,
  }: // auditLogger,
  Pick<ScheduleDataviewSyncTaskParams, 'getStartServices' | 'logger'> & {
    server: EntityManagerServerSetup;
  }) =>
  () => {
    // let abortController: AbortController;
    return {
      run: async () => {
        console.log('running task', TASK_TYPE);
        const [coreStart, { encryptedSavedObjects }] = await getStartServices();

        console.log('reading entity discovery API key from saved object', TASK_TYPE);
        const apiKey = await readEntityDiscoveryAPIKey(server);

        console.log('apiKey', apiKey, TASK_TYPE);
        if (apiKey === undefined) {
          throw new Error('API key not found');
          // return response.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_FOUND } });
        }

        console.log('validating existing entity discovery API key', TASK_TYPE);
        const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);

        if (!isValid) {
          throw new Error('API key invalid');
          // return response.ok({ body: { enabled: false, reason: ERROR_API_KEY_NOT_VALID } });
        }

        const { esClient, soClient } = await getClientsFromAPIKey({
          apiKey,
          server,
        });

        //   abortController = new AbortController();
        // const [coreStart, { dataViews }] = await getStartServices();
        // const soClient = coreStart.savedObjects.getIndexForType;

        const definitions = findEntityDefinitions({
          soClient,
          esClient,
          // builtIn,
          // id,
          page: 1,
          perPage: 10,
          // includeState = false,
          // type,
        });

        console.log('==============================111==============');
        console.log(JSON.stringify(definitions), TASK_TYPE);

        //   const esClient = coreStart.elasticsearch.client.asInternalUser;
        //   console.log(
        //     `Task "${TASK_TYPE}" finished. Updated documents: ${response.updated}, failures: ${
        //       hasFailures ? failures.join('\n') : 0
        //     }`
        //   );
      },

      cancel: async () => {
        // abortController.abort();
        // logger.debug(`Task cancelled: "${TASK_TYPE}"`);
      },
    };
  };
