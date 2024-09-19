/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';
import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { MAX_NUMBER_OF_ENTITIES, type EntityType } from '../../../common/entities';
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '../../../common/es_fields/entities';

const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

const BUILTIN_SERVICES_FROM_ECS_DATA = 'builtin_services_from_ecs_data';
const BUILTIN_HOSTS_FROM_ECS_DATA = 'builtin_hosts_from_ecs_data';
const BUILTIN_CONTAINERS_FROM_ECS_DATA = 'builtin_containers_from_ecs_data';

export interface LatestEntity {
  [ENTITY_LAST_SEEN]: string;
  [ENTITY_TYPE]: string;
  [ENTITY_DISPLAY_NAME]: string;
  [ENTITY_ID]: string;
}

const DEFAULT_ENTITY_TYPES = ['service', 'host', 'container'];

export async function getLatestEntities({
  inventoryEsClient,
  sortDirection,
  sortField,
  entityTypes,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  entityTypes?: EntityType[];
}) {
  const entityTypesFilter = entityTypes?.length ? entityTypes : DEFAULT_ENTITY_TYPES;
  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
     | WHERE ${ENTITY_TYPE} IN (${entityTypesFilter.map((entityType) => `"${entityType}"`).join()}) 
     | WHERE ${ENTITY_DEFINITION_ID} IN (${[
      BUILTIN_SERVICES_FROM_ECS_DATA,
      BUILTIN_HOSTS_FROM_ECS_DATA,
      BUILTIN_CONTAINERS_FROM_ECS_DATA,
    ]
      .map((buildin) => `"${buildin}"`)
      .join()})
     | SORT ${sortField} ${sortDirection}
     | LIMIT ${MAX_NUMBER_OF_ENTITIES}
     | KEEP ${ENTITY_LAST_SEEN}, ${ENTITY_TYPE}, ${ENTITY_DISPLAY_NAME}, ${ENTITY_ID}
    `,
  });

  return esqlResultToPlainObjects<LatestEntity>(latestEntitiesEsqlResponse);
}
