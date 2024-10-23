/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateHistoryIndexName, generateLatestIndexName } from './helpers/generate_component_id';

export async function deleteIndices(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  const index = generateLatestIndexName(definition);
  try {
<<<<<<< HEAD
    const { indices: historyIndices } = await esClient.indices.resolveIndex({
      name: `${generateHistoryIndexName(definition)}.*`,
      expand_wildcards: 'all',
    });
    const indices = [
      ...historyIndices.map(({ name }) => name),
      generateLatestIndexName(definition),
    ];
    await esClient.indices.delete({ index: indices, ignore_unavailable: true });
=======
    await esClient.indices.delete({ index, ignore_unavailable: true });
>>>>>>> 0617ad44406 ([eem] rename fields to snake case (#195895))
  } catch (e) {
    logger.error(
      `Unable to remove entity definition index ${index} for definition [${definition.id}]`
    );
    throw e;
  }
}
