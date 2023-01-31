/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CoreSetup, Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { APMConfig } from '../..';
import {
  APM_TELEMETRY_SAVED_OBJECT_ID,
  APM_TELEMETRY_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { collectDataTelemetry } from './collect_data_telemetry';
import { APMUsage } from './types';
import { apmSchema } from './schema';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { getTelemetryClient } from './telemetry_client';

export const APM_TELEMETRY_TASK_NAME = 'apm-telemetry-task';

export async function createApmTelemetry({
  core,
  config,
  usageCollector,
  taskManager,
  logger,
  kibanaVersion,
  isProd,
}: {
  core: CoreSetup;
  config: APMConfig;
  usageCollector: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  kibanaVersion: string;
  isProd: boolean;
}) {
  taskManager.registerTaskDefinitions({
    [APM_TELEMETRY_TASK_NAME]: {
      title: 'Collect APM usage',
      createTaskRunner: () => {
        return {
          run: async () => {
            await collectAndStore();
          },
          cancel: async () => {},
        };
      },
    },
  });

  const [coreStart] = await core.getStartServices();
  const savedObjectsClient = await getInternalSavedObjectsClient(coreStart);
  const indices = await getApmIndices({ config, savedObjectsClient });
  const telemetryClient = await getTelemetryClient({ core });

  const collectAndStore = async () => {
    const dataTelemetry = await collectDataTelemetry({
      indices,
      telemetryClient,
      logger,
      savedObjectsClient,
      isProd,
    });

    await savedObjectsClient.create(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      {
        ...dataTelemetry,
        kibanaVersion,
      },
      { id: APM_TELEMETRY_SAVED_OBJECT_TYPE, overwrite: true }
    );
  };

  const collector = usageCollector.makeUsageCollector<APMUsage | {}>({
    type: 'apm',
    schema: apmSchema,
    fetch: async () => {
      try {
        const { kibanaVersion: storedKibanaVersion, ...data } = (
          await savedObjectsClient.get(
            APM_TELEMETRY_SAVED_OBJECT_TYPE,
            APM_TELEMETRY_SAVED_OBJECT_ID
          )
        ).attributes as { kibanaVersion: string } & APMUsage;

        return data;
      } catch (err) {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          // task has not run yet, so no saved object to return
          return {};
        }
        throw err;
      }
    },
    isReady: () => true,
  });

  usageCollector.registerCollector(collector);

  core.getStartServices().then(async ([_coreStart, pluginsStart]) => {
    const { taskManager: taskManagerStart } = pluginsStart as {
      taskManager: TaskManagerStartContract;
    };

    taskManagerStart.ensureScheduled({
      id: APM_TELEMETRY_TASK_NAME,
      taskType: APM_TELEMETRY_TASK_NAME,
      schedule: {
        interval: '720m',
      },
      scope: ['apm'],
      params: {},
      state: {},
    });

    try {
      const currentData = (
        await savedObjectsClient.get(
          APM_TELEMETRY_SAVED_OBJECT_TYPE,
          APM_TELEMETRY_SAVED_OBJECT_ID
        )
      ).attributes as { kibanaVersion?: string };

      if (currentData.kibanaVersion !== kibanaVersion) {
        logger.debug(
          `Stored telemetry is out of date. Task will run immediately. Stored: ${currentData.kibanaVersion}, expected: ${kibanaVersion}`
        );
        await taskManagerStart.runSoon(APM_TELEMETRY_TASK_NAME);
      }
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        logger.warn('Failed to fetch saved telemetry data.');
      }
    }
  });
}
