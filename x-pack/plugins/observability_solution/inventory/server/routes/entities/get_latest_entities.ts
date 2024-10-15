/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { ENTITY_LAST_SEEN } from '@kbn/observability-shared-plugin/common';
import {
  ENTITIES_LATEST_ALIAS,
  MAX_NUMBER_OF_ENTITIES,
  type EntityType,
  type Entity,
  type EntityColumnIds,
} from '../../../common/entities';
import { getEntityDefinitionIdWhereClause, getEntityTypesWhereClause } from './query_helper';

export async function getLatestEntities({
  inventoryEsClient,
  sortDirection,
  sortField,
  entityTypes,
  kuery,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: EntityColumnIds;
  entityTypes?: EntityType[];
  kuery?: string;
}) {
  // alertsCount doesn't exist in entities index. Ignore it and sort by entity.lastSeenTimestamp by default.
  const entitiesSortField = sortField === 'alertsCount' ? ENTITY_LAST_SEEN : sortField;

  const request = {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
     | ${getEntityTypesWhereClause(entityTypes)}
     | ${getEntityDefinitionIdWhereClause()}
     | SORT ${entitiesSortField} ${sortDirection}
     | LIMIT ${MAX_NUMBER_OF_ENTITIES}
     `,
    filter: {
      bool: {
        filter: [...kqlQuery(kuery)],
      },
    },
  };

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', request);

  return esqlResultToPlainObjects<Entity>(latestEntitiesEsqlResponse);
}
