/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import {
  ENTITIES_LATEST_ALIAS,
  MAX_NUMBER_OF_ENTITIES,
  type EntityType,
} from '../../../common/entities';
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '../../../common/es_fields/entities';

export const BUILTIN_SERVICES_FROM_ECS_DATA = 'builtin_services_from_ecs_data';
export const BUILTIN_HOSTS_FROM_ECS_DATA = 'builtin_hosts_from_ecs_data';
export const BUILTIN_CONTAINERS_FROM_ECS_DATA = 'builtin_containers_from_ecs_data';

export interface LatestEntity {
  [ENTITY_LAST_SEEN]: string;
  [ENTITY_TYPE]: string;
  [ENTITY_DISPLAY_NAME]: string;
  [ENTITY_ID]: string;
}

export const DEFAULT_ENTITY_TYPES: EntityType[] = ['service', 'host', 'container'];

export async function getLatestEntities({
  inventoryEsClient,
  sortDirection,
  sortField,
  entityTypes,
  kuery,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  entityTypes?: EntityType[];
  kuery?: string;
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
    filter: {
      bool: {
        filter: [...kqlQuery(kuery)],
      },
    },
  });

  return esqlResultToPlainObjects<LatestEntity>(latestEntitiesEsqlResponse);
}
