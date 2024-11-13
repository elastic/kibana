/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import type { EntityInstance } from '@kbn/entities-schema';
import { ENTITIES_LATEST_ALIAS } from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

export async function getEntityTypes({
  inventoryEsClient,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
}) {
  const entityTypesEsqlResponse = await inventoryEsClient.esql<{
    entity: Pick<EntityInstance['entity'], 'type'>;
  }>('get_entity_types', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
     | ${getBuiltinEntityDefinitionIdESQLWhereClause()}
     | STATS count = COUNT(${ENTITY_TYPE}) BY ${ENTITY_TYPE}
    `,
  });

  return entityTypesEsqlResponse.map((response) => response.entity.type);
}
