/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import {
  ENTITIES_LATEST_ALIAS,
  EntityGroup,
  MAX_NUMBER_OF_ENTITIES,
  defaultEntityTypes,
} from '../../../common/entities';
import { getEntityDefinitionIdWhereClause, getEntityTypesWhereClause } from './query_helper';

export async function getEntityGroupsBy({
  inventoryEsClient,
  field,
  kuery,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  field: string;
  kuery?: string;
}) {
  const groups = await inventoryEsClient.esql('get_entities_groups', {
    query: `
        FROM ${ENTITIES_LATEST_ALIAS}
        | ${getEntityTypesWhereClause(defaultEntityTypes)}
        | ${getEntityDefinitionIdWhereClause()}
        | STATS count = COUNT(*) by ${field}
        | SORT ${field} asc
        | LIMIT ${MAX_NUMBER_OF_ENTITIES}
      `,
    filter: {
      bool: {
        filter: [...kqlQuery(kuery)],
      },
    },
  });

  return esqlResultToPlainObjects<EntityGroup>(groups);
}
