/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { getBuiltinEntityDefinitionIdESQLWhereClause } from '../entities/query_helper';
import { ENTITIES_LATEST_ALIAS } from '../../../common/entities';

export async function getHasData({
  inventoryEsClient,
  logger,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  logger: Logger;
}) {
  try {
    const esqlResults = await inventoryEsClient.esql<{ _count: number }, { transform: 'plain' }>(
      'get_has_data',
      {
        query: `FROM ${ENTITIES_LATEST_ALIAS} 
      | ${getBuiltinEntityDefinitionIdESQLWhereClause()} 
      | STATS _count = COUNT(*)
      | LIMIT 1`,
      },
      { transform: 'plain' }
    );

    const totalCount = esqlResults.hits[0]._count;

    return { hasData: totalCount > 0 };
  } catch (e) {
    logger.error(e);
    return { hasData: false };
  }
}
