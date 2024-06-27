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
import { deleteEntityDefinition } from './delete_entity_definition';
import { deleteHistoryIngestPipeline, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { findEntityDefinitions } from './find_entity_definition';
import {
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from './stop_and_delete_transform';

export async function uninstallEntityDefinition({
  definition,
  esClient,
  soClient,
  logger,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
}) {
  await stopAndDeleteHistoryTransform(esClient, definition, logger);
  await stopAndDeleteLatestTransform(esClient, definition, logger);
  await deleteHistoryIngestPipeline(esClient, definition, logger);
  await deleteLatestIngestPipeline(esClient, definition, logger);
  await deleteEntityDefinition(soClient, definition, logger);
}

export async function uninstallBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<EntityDefinition[]> {
  const definitions = await findEntityDefinitions({
    soClient,
    esClient,
    builtIn: true,
  });

  await Promise.all(
    definitions.map(async (definition) => {
      await uninstallEntityDefinition({ definition, esClient, soClient, logger });
    })
  );

  return definitions;
}
