/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';
import { generateIndexName } from './helpers/generate_index_name';

export async function deleteIndex(
  esClient: ElasticsearchClient,
  definition: OAMDefinition,
  logger: Logger
) {
  const indexName = generateIndexName(definition);
  try {
    esClient.indices.delete({ index: indexName, ignore_unavailable: true });
  } catch (e) {
    logger.error(`Unable to remove OAM Defintion index [${definition.id}}]`);
    throw e;
  }
}
