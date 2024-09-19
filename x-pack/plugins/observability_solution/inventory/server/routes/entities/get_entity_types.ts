/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { ENTITIES_LATEST_ALIAS, EntityType } from '../../../common/entities';
import { ENTITY_DEFINITION_ID, ENTITY_TYPE } from '../../../common/es_fields/entities';
import {
  BUILTIN_CONTAINERS_FROM_ECS_DATA,
  BUILTIN_HOSTS_FROM_ECS_DATA,
  BUILTIN_SERVICES_FROM_ECS_DATA,
  DEFAULT_ENTITY_TYPES,
} from './get_latest_entities';

export async function getEntityTypes({
  inventoryEsClient,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
}) {
  const entityTypesEsqlResponse = await inventoryEsClient.esql('get_entity_types', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
    | WHERE ${ENTITY_TYPE} IN (${DEFAULT_ENTITY_TYPES.map(
      (entityType) => `"${entityType}"`
    ).join()}) 
     | WHERE ${ENTITY_DEFINITION_ID} IN (${[
      BUILTIN_SERVICES_FROM_ECS_DATA,
      BUILTIN_HOSTS_FROM_ECS_DATA,
      BUILTIN_CONTAINERS_FROM_ECS_DATA,
    ]
      .map((buildin) => `"${buildin}"`)
      .join()})
     | STATS count = COUNT(${ENTITY_TYPE}) BY ${ENTITY_TYPE}
    `,
  });

  return entityTypesEsqlResponse.values.map(([_, val]) => val as EntityType);
}
