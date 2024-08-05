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
  getEntityHistoryIndexTemplateV1,
  getEntityLatestIndexTemplateV1,
} from '../../../common/helpers';
import { deleteEntityDefinition } from './delete_entity_definition';
import { deleteIndices } from './delete_index';
import { deleteHistoryIngestPipeline, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { findEntityDefinitions } from './find_entity_definition';
import {
  stopAndDeleteHistoryBackfillTransform,
  stopAndDeleteHistoryTransform,
  stopAndDeleteLatestTransform,
} from './stop_and_delete_transform';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';
import { deleteTemplate } from '../manage_index_templates';

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
  await stopAndDeleteHistoryTransform(esClient, definition, logger);
  if (isBackfillEnabled(definition)) {
    await stopAndDeleteHistoryBackfillTransform(esClient, definition, logger);
  }
  await stopAndDeleteLatestTransform(esClient, definition, logger);
  await deleteHistoryIngestPipeline(esClient, definition, logger);
  await deleteLatestIngestPipeline(esClient, definition, logger);
  await deleteEntityDefinition(soClient, definition, logger);
  await deleteTemplate({ esClient, logger, name: getEntityHistoryIndexTemplateV1(definition.id) });
  await deleteTemplate({ esClient, logger, name: getEntityLatestIndexTemplateV1(definition.id) });

  if (deleteData) {
    await deleteIndices(esClient, definition, logger);
  }
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
