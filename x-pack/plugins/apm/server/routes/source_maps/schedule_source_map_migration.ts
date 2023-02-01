/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { FleetArtifactsClient } from '@kbn/fleet-plugin/server/services';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { CoreStart, Logger } from '@kbn/core/server';
import { getApmArtifactClient } from '../fleet/source_maps';
import { bulkCreateApmSourceMaps } from './bulk_create_apm_source_maps';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';
import { ApmSourceMap } from './create_apm_source_map_index_template';
import { APMPluginStartDependencies } from '../../types';
import { createApmSourceMapIndexTemplate } from './create_apm_source_map_index_template';

const PER_PAGE = 10;
const TASK_ID = 'apm-source-map-migration-task-id';
const TASK_TYPE = 'apm-source-map-migration-task';

export async function scheduleSourceMapMigration({
  coreStartPromise,
  pluginStartPromise,
  taskManager,
  logger,
}: {
  coreStartPromise: Promise<CoreStart>;
  pluginStartPromise: Promise<APMPluginStartDependencies>;
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
}) {
  if (!taskManager) {
    return;
  }

  logger.debug(`Register task "${TASK_TYPE}"`);

  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Migrate fleet source map artifacts',
      description: `Migrates fleet source map artifacts to "${APM_SOURCE_MAP_INDEX}" index`,
      timeout: '1h',
      maxAttempts: 5,
      maxConcurrency: 1,
      createTaskRunner() {
        const taskState: TaskState = { isAborted: false };

        return {
          async run() {
            logger.debug(`Run task: "${TASK_TYPE}"`);
            const coreStart = await coreStartPromise;
            const internalESClient =
              coreStart.elasticsearch.client.asInternalUser;

            // ensure that the index template has been created before running migration
            await createApmSourceMapIndexTemplate({
              client: internalESClient,
              logger,
            });

            const pluginStart = await pluginStartPromise;
            const fleet = await pluginStart.fleet;
            if (fleet) {
              await runFleetSourcemapArtifactsMigration({
                taskState,
                fleet,
                internalESClient,
                logger,
              });
            }
          },

          async cancel() {
            taskState.isAborted = true;
            logger.debug(`Task cancelled: "${TASK_TYPE}"`);
          },
        };
      },
    },
  });

  const pluginStart = await pluginStartPromise;
  const taskManagerStart = pluginStart.taskManager;

  if (taskManagerStart) {
    logger.debug(`Task scheduled: "${TASK_TYPE}"`);
    await pluginStart.taskManager?.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      scope: ['apm'],
      params: {},
      state: {},
    });
  }
}

interface TaskState {
  isAborted: boolean;
}

export async function runFleetSourcemapArtifactsMigration({
  taskState,
  fleet,
  internalESClient,
  logger,
}: {
  taskState?: TaskState;
  fleet: FleetStartContract;
  internalESClient: ElasticsearchClient;
  logger: Logger;
}) {
  try {
    const latestApmSourceMapTimestamp = await getLatestApmSourceMap(
      internalESClient
    );
    const createdDateFilter = latestApmSourceMapTimestamp
      ? ` AND created:>${asLuceneEncoding(latestApmSourceMapTimestamp)}`
      : '';

    await paginateArtifacts({
      taskState,
      page: 1,
      apmArtifactClient: getApmArtifactClient(fleet),
      kuery: `type: sourcemap${createdDateFilter}`,
      logger,
      internalESClient,
    });
  } catch (e) {
    logger.error('Failed to migrate APM fleet source map artifacts');
    logger.error(e);
  }
}

// will convert "2022-12-12T21:21:51.203Z" to "2022-12-12T21\:21\:51.203Z" because colons are not allowed when using Lucene syntax
function asLuceneEncoding(timestamp: string) {
  return timestamp.replaceAll(':', '\\:');
}

async function getArtifactsForPage({
  page,
  apmArtifactClient,
  kuery,
}: {
  page: number;
  apmArtifactClient: FleetArtifactsClient;
  kuery: string;
}) {
  return await apmArtifactClient.listArtifacts({
    kuery,
    perPage: PER_PAGE,
    page,
    sortOrder: 'asc',
    sortField: 'created',
  });
}

async function paginateArtifacts({
  taskState,
  page,
  apmArtifactClient,
  kuery,
  logger,
  internalESClient,
}: {
  taskState?: TaskState;
  page: number;
  apmArtifactClient: FleetArtifactsClient;
  kuery: string;
  logger: Logger;
  internalESClient: ElasticsearchClient;
}) {
  if (taskState?.isAborted) {
    return;
  }

  const { total, items: artifacts } = await getArtifactsForPage({
    page,
    apmArtifactClient,
    kuery,
  });

  if (artifacts.length === 0) {
    logger.debug('No source maps need to be migrated');
    return;
  }

  const migratedCount = (page - 1) * PER_PAGE + artifacts.length;
  logger.info(`Migrating ${migratedCount} of ${total} source maps`);

  await bulkCreateApmSourceMaps({ artifacts, internalESClient });

  const hasMorePages = total > migratedCount;
  if (hasMorePages) {
    await paginateArtifacts({
      taskState,
      page: page + 1,
      apmArtifactClient,
      kuery,
      logger,
      internalESClient,
    });
  } else {
    logger.info(`Successfully migrated ${total} source maps`);
  }
}

async function getLatestApmSourceMap(internalESClient: ElasticsearchClient) {
  const params = {
    index: APM_SOURCE_MAP_INDEX,
    track_total_hits: false,
    size: 1,
    _source: ['created'],
    sort: [{ created: { order: 'desc' } }],
    body: {
      query: { match_all: {} },
    },
  };
  const res = await internalESClient.search<ApmSourceMap>(params);
  return res.hits.hits[0]?._source?.created;
}
