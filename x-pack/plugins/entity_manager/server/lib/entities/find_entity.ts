/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { EntityDefinition, EntityLatestDoc } from '@kbn/entities-schema';
import { generateInstanceIndexName } from './helpers/generate_component_id';

export async function findEntity(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  id: string
) {
  const params = {
    index: generateInstanceIndexName(definition),
    id,
  };
  const response = await esClient.get<EntityLatestDoc>(params);
  return response._source;
}
