/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateIndexName } from './helpers/generate_index_name';

export async function deleteIndex(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const indexName = generateIndexName(definition);
  try {
    await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
  } catch (e) {
    logger.error(`Unable to remove entity definition index [${definition.id}}]`);
    throw e;
  }
}
