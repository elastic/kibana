/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { esqlResultToPlainObjects } from '@kbn/observability-utils/es/utils/esql_result_to_plain_objects';
import { type ObservabilityElasticsearchClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import {
  getEntityDefinitionIdWhereClause,
  getEntityTypesWhereClause,
} from '../entities/query_helper';
import { ENTITIES_LATEST_ALIAS } from '../../../common/entities';

export async function getHasData({
  inventoryEsClient,
  logger,
}: {
  inventoryEsClient: ObservabilityElasticsearchClient;
  logger: Logger;
}) {
  try {
    const esqlResults = await inventoryEsClient.esql('get_has_data', {
      query: `FROM ${ENTITIES_LATEST_ALIAS} 
      | ${getEntityDefinitionIdWhereClause()} 
      | ${getEntityTypesWhereClause()} 
      | STATS _count = COUNT(*)
      | LIMIT 1`,
    });

    const totalCount = esqlResultToPlainObjects(esqlResults)?.[0]._count ?? 0;

    return { hasData: totalCount > 0 };
  } catch (e) {
    logger.error(e);
    return { hasData: false };
  }
}
