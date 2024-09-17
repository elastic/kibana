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

const MAX_NUMBER_OF_ENTITIES = 500;
interface LatestEntity {
  'entity.lastSeenTimestamp': string;
  'entity.type': string;
  'entity.displayName': string;
  'entity.id': string;
}

export async function getLatestEntities({
  inventoryEsClient,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
}) {
  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
     | WHERE entity.type IN ("service", "host", "container") 
     | WHERE entity.definitionId IN ("builtin_services_from_ecs_data", "builtin_hosts_from_ecs_data", "builtin_containers_from_ecs_data")
     | SORT entity.lastSeenTimestamp DESC
     | LIMIT ${MAX_NUMBER_OF_ENTITIES}
     | KEEP entity.id, entity.displayName, entity.lastSeenTimestamp, entity.type
    `,
  });

  return esqlResultToPlainObjects<LatestEntity>(latestEntitiesEsqlResponse);
}
