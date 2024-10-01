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
  Entity,
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
  sortField: string;
  entityTypes?: EntityType[];
  kuery?: string;
}) {
  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query: `FROM ${ENTITIES_LATEST_ALIAS}
     | ${getEntityTypesWhereClause(entityTypes)}
     | ${getEntityDefinitionIdWhereClause()}
     | SORT ${sortField} ${sortDirection}
     | LIMIT ${MAX_NUMBER_OF_ENTITIES}
     `,
    filter: {
      bool: {
        filter: [...kqlQuery(kuery)],
      },
    },
  });

  return esqlResultToPlainObjects<Entity>(latestEntitiesEsqlResponse);
}
