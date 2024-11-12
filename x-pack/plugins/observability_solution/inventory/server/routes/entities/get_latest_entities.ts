/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_LAST_SEEN, ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { esqlResultToPlainObjects } from '@kbn/observability-utils-server/es/esql_result_to_plain_objects';
import {
  ENTITIES_LATEST_ALIAS,
  MAX_NUMBER_OF_ENTITIES,
  type Entity,
  type EntityColumnIds,
} from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

export async function getLatestEntities({
  inventoryEsClient,
  sortDirection,
  sortField,
  esQuery,
  entityTypes,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  sortDirection: 'asc' | 'desc';
  sortField: EntityColumnIds;
  esQuery?: QueryDslQueryContainer;
  entityTypes?: string[];
}) {
  // alertsCount doesn't exist in entities index. Ignore it and sort by entity.lastSeenTimestamp by default.
  const entitiesSortField = sortField === 'alertsCount' ? ENTITY_LAST_SEEN : sortField;

  const from = `FROM ${ENTITIES_LATEST_ALIAS}`;
  const where: string[] = [getBuiltinEntityDefinitionIdESQLWhereClause()];
  const params: ScalarValue[] = [];

  if (entityTypes) {
    where.push(`WHERE ${ENTITY_TYPE} IN (${entityTypes.map(() => '?').join()})`);
    params.push(...entityTypes);
  }

  const sort = `SORT ${entitiesSortField} ${sortDirection}`;
  const limit = `LIMIT ${MAX_NUMBER_OF_ENTITIES}`;

  const query = [from, ...where, sort, limit].join(' | ');

  const latestEntitiesEsqlResponse = await inventoryEsClient.esql('get_latest_entities', {
    query,
    filter: esQuery,
    params,
  });

  return esqlResultToPlainObjects<Entity>(latestEntitiesEsqlResponse);
}
