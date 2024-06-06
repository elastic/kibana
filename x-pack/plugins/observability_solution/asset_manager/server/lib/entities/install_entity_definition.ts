/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityDefinition } from '@kbn/entities-schema';
import { Logger } from '@kbn/logging';
import {
  createAndInstallHistoryIngestPipeline,
  createAndInstallLatestIngestPipeline,
} from './create_and_install_ingest_pipeline';
import {
  createAndInstallHistoryTransform,
  createAndInstallLatestTransform,
} from './create_and_install_transform';
import { deleteEntityDefinition } from './delete_entity_definition';
import { deleteHistoryIngestPipeline, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { saveEntityDefinition } from './save_entity_definition';
import { stopAndDeleteHistoryTransform } from './stop_and_delete_transform';

export interface InstallDefinitionParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  definition: EntityDefinition;
  logger: Logger;
  spaceId: string;
}

export async function installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
  spaceId,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  const installState = {
    ingestPipelines: {
      history: false,
      latest: false,
    },
    transforms: {
      history: false,
      latest: false,
    },
    definition: false,
  };

  try {
    logger.debug(`Installing definition ${JSON.stringify(definition)}`);
    const entityDefinition = await saveEntityDefinition(soClient, definition);
    installState.definition = true;

    // install ingest pipelines
    logger.debug(`Installing ingest pipelines for definition ${definition.id}`);
    await createAndInstallHistoryIngestPipeline(esClient, entityDefinition, logger, spaceId);
    installState.ingestPipelines.history = true;
    await createAndInstallLatestIngestPipeline(esClient, entityDefinition, logger, spaceId);
    installState.ingestPipelines.latest = true;

    // install transforms
    logger.debug(`Installing transforms for definition ${definition.id}`);
    await createAndInstallHistoryTransform(esClient, entityDefinition, logger);
    installState.transforms.history = true;
    await createAndInstallLatestTransform(esClient, entityDefinition, logger);

    return entityDefinition;
  } catch (e) {
    logger.error(`Failed to install entity definition ${definition.id}`, e);
    // Clean up anything that was successful.
    if (installState.definition) {
      await deleteEntityDefinition(soClient, definition, logger);
    }

    if (installState.ingestPipelines.history) {
      await deleteHistoryIngestPipeline(esClient, definition, logger);
    }
    if (installState.ingestPipelines.latest) {
      await deleteLatestIngestPipeline(esClient, definition, logger);
    }

    if (installState.transforms.history) {
      await stopAndDeleteHistoryTransform(esClient, definition, logger);
    }

    throw e;
  }
}

export async function installEntityDefinitions({
  esClient,
  soClient,
  logger,
  definitions,
  spaceId,
}: Omit<InstallDefinitionParams, 'definition'> & { definitions: EntityDefinition[] }): Promise<
  EntityDefinition[]
> {
  if (definitions.length === 0) return [];

  logger.debug(`Starting installation of ${definitions.length} definitions`);
  const installPromises = definitions.map(async (definition) =>
    installEntityDefinition({ esClient, soClient, definition, logger, spaceId })
  );

  return Promise.all(installPromises);
}
