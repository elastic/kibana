/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';

const LATEST_ENTITIES_INDEX = `entities-*-latest`;

const MAX_NUMBER_OF_ENTITIES = 500;

export function searchLatestEntitiesIndex({
  esClient,
  start,
  end,
  kuery,
  dslFilter,
}: {
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  kuery?: string;
  dslFilter?: QueryDslQueryContainer[];
}) {
  return esClient.esql('search_latest_entities', {
    ...getEsqlRequest({
      query: `FROM ${LATEST_ENTITIES_INDEX} | SORT entity.displayName ASC | LIMIT ${MAX_NUMBER_OF_ENTITIES}`,
      dslFilter: [
        ...(dslFilter ?? []),
        ...kqlQuery(kuery),
        {
          range: {
            'entity.lastSeenTimestamp': {
              gte: start,
            },
          },
        },
        {
          range: {
            'entity.firstSeenTimestamp': {
              lte: end,
            },
          },
        },
      ],
    }),
  });
}
