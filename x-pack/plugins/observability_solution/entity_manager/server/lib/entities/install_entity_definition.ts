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
import { findEntityDefinitions } from './find_entity_definition';
import { saveEntityDefinition } from './save_entity_definition';
import { startTransform } from './start_transform';
import {
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from './stop_and_delete_transform';
import { uninstallEntityDefinition } from './uninstall_entity_definition';

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
    installState.transforms.latest = true;

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

    if (installState.transforms.latest) {
      await stopAndDeleteLatestTransform(esClient, definition, logger);
    }

    throw e;
  }
}

export async function installBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
  builtInDefinitions,
  spaceId,
}: Omit<InstallDefinitionParams, 'definition'> & {
  builtInDefinitions: EntityDefinition[];
}): Promise<EntityDefinition[]> {
  if (builtInDefinitions.length === 0) return [];

  logger.debug(`Starting installation of ${builtInDefinitions.length} built-in definitions`);
  const installPromises = builtInDefinitions.map(async (builtInDefinition) => {
    const definitions = await findEntityDefinitions({
      esClient,
      soClient,
      id: builtInDefinition.id,
    });

    if (definitions.length === 0) {
      return await installAndStartDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
        spaceId,
      });
    }

    const definition = definitions[0];
    // verify current installation
    if (!definition.state.installed) {
      logger.debug(`Detected partial installation of definition [${definition.id}], reinstalling`);
      await uninstallEntityDefinition({ esClient, soClient, logger, definition });
      return await installAndStartDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
        spaceId,
      });
    }

    if (!definition.state.running) {
      logger.debug(`Starting transforms for definition [${definition.id}]`);
      await startTransform(esClient, definition, logger);
    }
    return definition;
  });

  return await Promise.all(installPromises);
}

async function installAndStartDefinition(params: InstallDefinitionParams) {
  const definition = await installEntityDefinition(params);
  await startTransform(params.esClient, definition, params.logger);
  return definition;
}
