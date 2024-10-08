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
import { deleteIndices } from './delete_index';
import { deleteHistoryIngestPipeline, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { findEntityDefinitions } from './find_entity_definition';

import {
  generateHistoryIndexTemplateId,
  generateLatestIndexTemplateId,
} from './helpers/generate_component_id';
import { deleteTemplate } from '../manage_index_templates';

import { stopTransforms } from './stop_transforms';

import { deleteTransforms } from './delete_transforms';

export async function uninstallEntityDefinition({
  definition,
  esClient,
  soClient,
  logger,
  deleteData = false,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  deleteData?: boolean;
}) {
  await stopTransforms(esClient, definition, logger);
  await deleteTransforms(esClient, definition, logger);

  await Promise.all([
    deleteHistoryIngestPipeline(esClient, definition, logger),
    deleteLatestIngestPipeline(esClient, definition, logger),
  ]);

  if (deleteData) {
    await deleteIndices(esClient, definition, logger);
  }

  await Promise.all([
    deleteTemplate({ esClient, logger, name: generateHistoryIndexTemplateId(definition) }),
    deleteTemplate({ esClient, logger, name: generateLatestIndexTemplateId(definition) }),
  ]);

  await deleteEntityDefinition(soClient, definition);
}

export async function uninstallBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
  deleteData = false,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  deleteData?: boolean;
}): Promise<EntityDefinition[]> {
  const definitions = await findEntityDefinitions({
    soClient,
    esClient,
    builtIn: true,
  });

  await Promise.all(
    definitions.map(async (definition) => {
      await uninstallEntityDefinition({ definition, esClient, soClient, logger, deleteData });
    })
  );

  return definitions;
}
