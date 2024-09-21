/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { Entity } from '../../../common/entities';
import { toEntity } from '../../../common/utils/to_entity';

export async function getEntityById({
  esClient,
  type,
  displayName,
}: {
  esClient: ObservabilityElasticsearchClient;
  type: string;
  displayName: string;
}): Promise<Entity> {
  const response = await esClient.esql('get_entity', {
    query: `FROM .entities*instance* | WHERE entity.type == "${type}" AND entity.displayName.keyword == "${displayName}" | LIMIT 1`,
  });

  if (response.values.length === 0) {
    throw notFound();
  }

  const result = esqlResultToPlainObjects(response)[0];
  return toEntity(result);
}
