/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';

const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

const ENTITY_TYPE = 'entity.type';

export async function getLatestEntity({
  inventoryEsClient,
  entityId,
  entityType,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  entityType: 'host' | 'container';
  entityId: string;
}) {
  const fieldName = entityType === 'host' ? 'host.name' : 'container.id';

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
        | WHERE ${ENTITY_TYPE} == "${entityType}"
        | WHERE ${fieldName} == "${entityId}"
      `,
  });

  return esqlResultToPlainObjects(latestEntitiesEsqlResponse)[0];
}
