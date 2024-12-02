/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateLatestIndexName } from './helpers/generate_component_id';

export async function deleteIndices(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const index = generateLatestIndexName(definition);
  try {
    await esClient.indices.delete({ index, ignore_unavailable: true });
  } catch (e) {
    logger.error(
      `Unable to remove entity definition index ${index} for definition [${definition.id}]`
    );
    throw e;
  }
}
