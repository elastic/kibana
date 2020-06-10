/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Logger } from 'src/core/server';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '../../../../task_manager/server';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import {
  APM_TELEMETRY_SAVED_OBJECT_ID,
  APM_TELEMETRY_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';
import {
  collectDataTelemetry,
  CollectTelemetryParams,
} from './collect_data_telemetry';
import { APMConfig } from '../..';
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';

const APM_TELEMETRY_TASK_NAME = 'apm-telemetry-task';

export async function createApmTelemetry({
  core,
  config$,
  usageCollector,
  taskManager,
  logger,
}: {
  core: CoreSetup;
  config$: Observable<APMConfig>;
  usageCollector: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}) {
  taskManager.registerTaskDefinitions({
    [APM_TELEMETRY_TASK_NAME]: {
      title: 'Collect APM telemetry',
      type: APM_TELEMETRY_TASK_NAME,
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

  const savedObjectsClient = await getInternalSavedObjectsClient(core);

  const collectAndStore = async () => {
    const config = await config$.pipe(take(1)).toPromise();
    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.legacy.client;

    const indices = await getApmIndices({
      config,
      savedObjectsClient,
    });

    const search = esClient.callAsInternalUser.bind(
      esClient,
      'search'
    ) as CollectTelemetryParams['search'];

    const indicesStats = esClient.callAsInternalUser.bind(
      esClient,
      'indices.stats'
    ) as CollectTelemetryParams['indicesStats'];

    const transportRequest = esClient.callAsInternalUser.bind(
      esClient,
      'transport.request'
    ) as CollectTelemetryParams['transportRequest'];

    const dataTelemetry = await collectDataTelemetry({
      search,
      indices,
      logger,
      indicesStats,
      transportRequest,
    });

    await savedObjectsClient.create(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      dataTelemetry,
      { id: APM_TELEMETRY_SAVED_OBJECT_TYPE, overwrite: true }
    );
  };

  const collector = usageCollector.makeUsageCollector({
    type: 'apm',
    fetch: async () => {
      try {
        const data = (
          await savedObjectsClient.get(
            APM_TELEMETRY_SAVED_OBJECT_TYPE,
            APM_TELEMETRY_SAVED_OBJECT_ID
          )
        ).attributes;

        return data;
      } catch (err) {
        if (err.output?.statusCode === 404) {
          // task has not run yet, so no saved object to return
          return {};
        }
        throw err;
      }
    },
    isReady: () => true,
  });

  usageCollector.registerCollector(collector);

  core.getStartServices().then(([_coreStart, pluginsStart]) => {
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
  });
}
