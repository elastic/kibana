/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateInstanceIndexName } from './helpers/generate_component_id';

export async function updateEntity(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  id: string,
  doc: Record<string, any>
) {
  const params: UpdateRequest = {
    id,
    index: generateInstanceIndexName(definition),
    doc,
    doc_as_upsert: true,
  };

  return await esClient.update(params);
}
