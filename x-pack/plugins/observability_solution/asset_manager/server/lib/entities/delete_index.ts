/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { ENTITY_BASE_PREFIX } from '../../../common/constants_entities';

export async function deleteIndices(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    const response = await esClient.indices.resolveIndex({
      name: `${ENTITY_BASE_PREFIX}*${definition.id}*`,
    });
    const indices = response.indices.map((doc) => doc.name);
    if (indices.length) {
      await esClient.indices.delete({ index: indices, ignore_unavailable: true });
    }
  } catch (e) {
    logger.error(`Unable to remove entity defintion index [${definition.id}}]`);
    throw e;
  }
}
