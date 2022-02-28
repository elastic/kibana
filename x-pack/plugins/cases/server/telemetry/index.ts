/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  ISavedObjectsRepository,
  Logger,
  PluginInitializerContext,
  SavedObjectsErrorHelpers,
} from 'src/core/server';
import { TaskManagerSetupContract } from '../../../task_manager/server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { collectTelemetryData } from './collect_telemetry_data';
import {
  CASE_TELEMETRY_SAVED_OBJECT,
  CASES_TELEMETRY_TASK_NAME,
  CASE_TELEMETRY_SAVED_OBJECT_ID,
} from '../../common/constants';
import { CasesTelemetry } from './types';
import { casesSchema } from './schema';

export { scheduleCasesTelemetryTask } from './schedule_telemetry_task';

interface CreateCasesTelemetryArgs {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection: UsageCollectionSetup;
  logger: Logger;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
}

export const createCasesTelemetry = async ({
  core,
  taskManager,
  usageCollection,
  logger,
  kibanaVersion,
}: CreateCasesTelemetryArgs) => {
  const getInternalSavedObjectClient = async (): Promise<ISavedObjectsRepository> => {
    const [coreStart] = await core.getStartServices();
    return coreStart.savedObjects.createInternalRepository();
  };

  taskManager.registerTaskDefinitions({
    [CASES_TELEMETRY_TASK_NAME]: {
      title: 'Collect Cases usage',
      createTaskRunner: () => {
        return {
          run: async () => {
            await collectAndStore();
          },
        };
      },
    },
  });

  const collectAndStore = async () => {
    const savedObjectsClient = await getInternalSavedObjectClient();
    const telemetryData = await collectTelemetryData();

    await savedObjectsClient.create(CASE_TELEMETRY_SAVED_OBJECT, telemetryData, {
      id: CASE_TELEMETRY_SAVED_OBJECT_ID,
      overwrite: true,
    });
  };

  const collector = usageCollection.makeUsageCollector<CasesTelemetry | {}>({
    type: 'cases',
    schema: casesSchema,
    isReady: () => true,
    fetch: async () => {
      try {
        const savedObjectsClient = await getInternalSavedObjectClient();
        const data = (
          await savedObjectsClient.get(CASE_TELEMETRY_SAVED_OBJECT, CASE_TELEMETRY_SAVED_OBJECT_ID)
        ).attributes as CasesTelemetry;

        return data;
      } catch (err) {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          // task has not run yet, so no saved object to return
          return {};
        }

        throw err;
      }
    },
  });

  usageCollection.registerCollector(collector);
};
