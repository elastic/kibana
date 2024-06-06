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

export async function installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  definition: EntityDefinition;
  logger: Logger;
  spaceId: string;
}): Promise<EntityDefinition> {
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
    const entityDefinition = await saveEntityDefinition(soClient, definition);
    installState.definition = true;

    // install ingest pipelines
    await createAndInstallHistoryIngestPipeline(esClient, entityDefinition, logger, spaceId);
    installState.ingestPipelines.history = true;
    await createAndInstallLatestIngestPipeline(esClient, entityDefinition, logger, spaceId);
    installState.ingestPipelines.latest = true;

    // install transforms
    await createAndInstallHistoryTransform(esClient, entityDefinition, logger);
    installState.transforms.history = true;
    await createAndInstallLatestTransform(esClient, entityDefinition, logger);

    return entityDefinition;
  } catch (e) {
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
