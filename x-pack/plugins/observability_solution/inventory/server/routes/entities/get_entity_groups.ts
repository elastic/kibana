/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import {
  ENTITIES_LATEST_ALIAS,
  type EntityGroup,
  MAX_NUMBER_OF_ENTITIES,
} from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

export async function getEntityGroupsBy({
  inventoryEsClient,
  field,
  esQuery,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  field: string;
  esQuery?: QueryDslQueryContainer;
}): Promise<EntityGroup[]> {
  const from = `FROM ${ENTITIES_LATEST_ALIAS}`;
  const where = [getBuiltinEntityDefinitionIdESQLWhereClause()];

  const group = `STATS count = COUNT(*) by ${field}`;
  const sort = `SORT ${field} asc`;
  const limit = `LIMIT ${MAX_NUMBER_OF_ENTITIES}`;
  const query = [from, ...where, group, sort, limit].join(' | ');

  const { hits } = await inventoryEsClient.esql<EntityGroup, { transform: 'plain' }>(
    'get_entities_groups',
    {
      query,
      filter: esQuery,
    },
    { transform: 'plain' }
  );

  return hits;
}
