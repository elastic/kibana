/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { esqlResultToPlainObjects } from '@kbn/observability-utils-server/es/esql_result_to_plain_objects';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { ScalarValue } from '@elastic/elasticsearch/lib/api/types';
import {
  ENTITIES_LATEST_ALIAS,
  type EntityGroup,
  MAX_NUMBER_OF_ENTITIES,
} from '../../../common/entities';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from './query_helper';

export async function getEntityGroupsBy({
  inventoryEsClient,
  field,
  kuery,
  entityTypes,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  field: string;
  kuery?: string;
  entityTypes?: string[];
}) {
  const from = `FROM ${ENTITIES_LATEST_ALIAS}`;
  const where = [getBuiltinEntityDefinitionIdESQLWhereClause()];
  const params: ScalarValue[] = [];

  if (entityTypes) {
    where.push(`WHERE ${ENTITY_TYPE} IN (${entityTypes.map(() => '?').join()})`);
    params.push(...entityTypes);
  }

  // STATS doesn't support parameterisation.
  const group = `STATS count = COUNT(*) by ${field}`;
  const sort = `SORT ${field} asc`;
  // LIMIT doesn't support parameterisation.
  const limit = `LIMIT ${MAX_NUMBER_OF_ENTITIES}`;
  const query = [from, ...where, group, sort, limit].join(' | ');

  const groups = await inventoryEsClient.esql('get_entities_groups', {
    query,
    filter: {
      bool: {
        filter: kqlQuery(kuery),
      },
    },
    params,
  });

  return esqlResultToPlainObjects<EntityGroup>(groups);
}
