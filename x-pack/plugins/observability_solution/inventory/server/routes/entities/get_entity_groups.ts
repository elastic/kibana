/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import {
  ENTITIES_LATEST_ALIAS,
  MAX_NUMBER_OF_ENTITIES,
  type EntityGroup,
} from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

export async function getEntityGroupsBy({
  inventoryEsClient,
  field,
  kuery,
  includeEntityTypes = [],
  excludeEntityTypes = [],
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  field: string;
  includeEntityTypes?: string[];
  excludeEntityTypes?: string[];
  kuery?: string;
}): Promise<EntityGroup[]> {
  const from = `FROM ${ENTITIES_LATEST_ALIAS}`;
  const where = [getBuiltinEntityDefinitionIdESQLWhereClause()];
  const params: ScalarValue[] = [];

  if (includeEntityTypes.length) {
    where.push(`WHERE ${ENTITY_TYPE} IN (${includeEntityTypes.map(() => '?').join()})`);
    params.push(...includeEntityTypes);
  }

  if (excludeEntityTypes.length) {
    where.push(`WHERE ${ENTITY_TYPE} NOT IN (${excludeEntityTypes.map(() => '?').join()})`);
    params.push(...excludeEntityTypes);
  }

  const group = `STATS count = COUNT(*) by ${field}`;
  const sort = `SORT ${field} asc`;
  const limit = `LIMIT ${MAX_NUMBER_OF_ENTITIES}`;
  const query = [from, ...where, group, sort, limit].join(' | ');

  const { hits } = await inventoryEsClient.esql<EntityGroup, { transform: 'plain' }>(
    'get_entities_groups',
    {
      query,
      filter: { bool: { filter: kqlQuery(kuery) } },
      params,
    },
    { transform: 'plain' }
  );

  return hits;
}
